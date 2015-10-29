var parseUrl = require('url').parse
var lpstream = require('length-prefixed-stream')
var pump = require('pump')
var zlib = require('zlib')
var Progress = require('./progress.js')

module.exports = server

function server (dat, req, res, opts, cb) {
  if (typeof opts === 'function') return server(dat, req, res, null, opts)
  if (!opts) opts = {}
  if (!cb) cb = noop

  var pathname = parseUrl(req.url).pathname
  var route = pathname.slice(pathname.lastIndexOf('/') + 1)

  if (route === 'diff' && req.method === 'POST') return ondiff(dat, req, res, cb)
  if (route === 'nodes' && req.method === 'POST' && !opts.readonly) return onpush(dat, req, res, cb)
  if (route === 'nodes' && req.method === 'GET' && !opts.writeonly) return onpull(dat, req, res, cb)

  res.statusCode = 404
  res.end()

  process.nextTick(function () {
    cb(new Error('Route does not exist'))
  })

  return null
}

function ondiff (dat, req, res, cb) {
  pump(req, lpstream.decode(), dat.createMatchStream({binary: true}), lpstream.encode(), res, cb)
  return null
}

function onpush (dat, req, res, cb) {
  var length = Number(req.headers['X-Nodes']) || 0
  if (req.headers['content-encoding'] === 'gzip') req = pump(req, zlib.createGunzip())

  var decode = lpstream.decode()
  var progress = Progress()
  var ws = dat.createWriteStream({binary: true})

  progress.on('end', function () {
    res.statusCode = 204
    res.end()
    cb()
  })

  progress.on('error', function (err) {
    onerror(err, res)
    cb(err)
  })

  pump(req, decode, ws, function (err) {
    progress.end(err)
  })

  progress.pushInit(length)
  decode.on('data', function () {
    progress.push()
  })

  return progress
}

function onpull (dat, req, res, cb) {
  var rs = dat.createReadStream({since: parseSince(req), binary: true})
  var progress = Progress()

  progress.on('end', cb)
  progress.on('error', function (err) {
    onerror(err, res)
    cb(err)
  })

  rs.on('error', end)
  rs.on('ready', function () {
    rs.removeListener('error', end)

    var encode = lpstream.encode()
    var gzipped = req.headers['accept-encoding'] === 'gzip'

    res.setHeader('X-Nodes', '' + rs.length)
    if (gzipped) res.setHeader('Content-Encoding', 'gzip')

    if (gzipped) pump(rs, encode, zlib.createGzip(), res, end)
    else pump(rs, encode, res, end)

    progress.pullInit(rs.length)
    encode.on('data', function () {
      progress.pull()
    })
  })

  return progress

  function end (err) {
    progress.end(err)
  }
}

function noop () {}

function parseSince (req) {
  var since = parseUrl(req.url, true).query.since
  return typeof since === 'string' && since ? since.split(',').map(toBuffer) : null
}

function onerror (err, res) {
  res.statusCode = 500
  res.end(err.message + '\n')
}

function toBuffer (str) {
  return new Buffer(str, 'hex')
}
