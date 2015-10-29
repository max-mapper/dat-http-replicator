var http = require('http')
var https = require('https')
var zlib = require('zlib')
var lpstream = require('length-prefixed-stream')
var pump = require('pump')
var events = require('events')
var parseUrl = require('url').parse

var USER_AGENT = 'dat-http-replicator'

module.exports = client

function client (dat, url, opts, cb) {
  if (typeof opts === 'function') return client(dat, url, null, opts)
  if (!opts) opts = {}
  if (!/:\/\//.test(url)) url = 'http://' + url

  var parsed = parseUrl(url)
  var host = parsed.hostname
  var port = parsed.port
  var name = parsed.pathname || '/'
  var mod = parsed.protocol === 'https:' ? https : http
  var progress = new events.EventEmitter()
  var mode = opts.mode || 'sync'

  if (!/\/$/.test(name)) name += '/'

  progress.pushed = {transferred: 0, length: 0}
  progress.pulled = {transferred: 0, length: 0}

  if (cb) {
    progress.on('end', cb)
    progress.on('error', cb)
  }

  diff(function (err, since) {
    if (err) return cb(err)

    var error = null
    var missing = mode === 'sync' ? 2 : 1

    if (mode === 'sync' || mode === 'push') push(since, done)
    if (mode === 'sync' || mode === 'pull') pull(since, done)

    function done (err) {
      if (err) error = err
      if (--missing) return
      if (error) progress.emit('error', error)
      else progress.emit('end')
    }
  })

  return progress

  function pull (since, cb) {
    var called = false
    var req = mod.request({
      method: 'GET',
      path: name + 'nodes?since=' + since.map(toString).join(','),
      host: host,
      port: port,
      headers: {
        'Accept-Encoding': 'gzip',
        'User-Agent': USER_AGENT
      }
    })

    req.on('error', done)
    req.on('response', function (res) {
      if (!okResponse(res)) return done(new Error('Remote returned ' + res.statusCode))

      var decode = lpstream.decode()
      var gzipped = res.headers['content-encoding'] === 'gzip'

      if (gzipped) pump(res, zlib.createGunzip(), decode, onerror)
      else pump(res, decode, onerror)

      progress.pulled.length = Number(res.headers['x-nodes'])
      progress.emit('pull', progress.pulled)

      pump(decode, dat.createWriteStream({binary: true}), done)
      decode.on('data', function () {
        progress.pulled.transferred++
        progress.emit('pull', progress.pulled)
      })
    })

    req.end()

    function onerror (err) {
      if (err) done(err)
    }

    function done (err) {
      if (called) return
      called = true
      cb(err)
    }
  }

  function push (since, cb) {
    var rs = dat.createReadStream({since: since, binary: true})

    rs.on('error', cb)
    rs.on('ready', function () {
      rs.removeListener('error', cb)

      var req = mod.request({
        method: 'POST',
        path: name + 'nodes',
        host: host,
        port: port,
        headers: {
          'X-Nodes': '' + rs.length,
          'Content-Encoding': 'gzip',
          'User-Agent': USER_AGENT
        }
      })

      req.on('response', function (res) {
        res.resume()
        if (!okResponse(res)) return cb(new Error('Remote returned ' + res.statusCode))
        cb()
      })

      pump(rs, lpstream.encode(), zlib.createGzip(), req, onerror)
      rs.on('data', onpush)
      progress.pushed.length = rs.length
      progress.emit('push', progress.pushed)

      function onpush () {
        progress.pushed.transferred++
        progress.emit('push', progress.pushed)
      }

      function onerror (err) {
        if (err) return cb(err)
      }
    })
  }

  function diff (cb) {
    var stream = dat.createDiffStream({binary: true})
    var req = null

    stream.on('data', function (data) {
      if (!req) req = diffRequest()
      req.write(data)
    })

    stream.on('flush', function () {
      req.end()
      req = null
    })

    stream.on('end', function () {
      cb(null, stream.since)
    })

    stream.on('error', function (err) {
      cb(err)
    })

    function diffRequest () {
      var encode = lpstream.encode()
      var req = mod.request({
        method: 'POST',
        path: name + 'diff',
        host: host,
        port: port,
        headers: {
          'User-Agent': USER_AGENT
        }
      })

      req.on('response', function (res) {
        if (!okResponse(res)) return onerror(new Error('Remote returned ' + res.statusCode))

        var decode = lpstream.decode()
        decode.on('data', function (data) {
          stream.write(data)
        })
        pump(res, decode, onerror)
      })

      pump(encode, req, onerror)
      return encode
    }

    function onerror (err) {
      if (err) stream.destroy(err)
    }
  }
}

function okResponse (res) {
  var ok = /2\d\d/.test(res.statusCode)
  if (!ok) res.resume()
  return ok
}

function toString (buf) {
  return buf.toString('hex')
}
