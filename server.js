var parseUrl = require('url').parse
var lpstream = require('length-prefixed-stream')
var pump = require('pump')
var zlib = require('zlib')

module.exports = server

function server (dat, req, res) {
  var pathname = parseUrl(req.url).pathname
  var route = pathname.slice(pathname.lastIndexOf('/') + 1)

  if (route === 'diff' && req.method === 'POST') return ondiff(dat, req, res)
  if (route === 'nodes' && req.method === 'POST') return onpush(dat, req, res)
  if (route === 'nodes' && req.method === 'GET') return onpull(dat, req, res)

  res.statusCode = 404
  res.end()
}

function ondiff (dat, req, res) {
  pump(req, lpstream.decode(), dat.createMatchStream({binary: true}), lpstream.encode(), res)
}

function onpush (dat, req, res) {
  if (req.headers['content-encoding'] === 'gzip') req = pump(req, zlib.createGunzip())
  pump(req, lpstream.decode(), dat.createWriteStream({binary: true}), function (err) {
    if (err) return onerror(err, res)
    res.statusCode = 204
    res.end()
  })
}

function onpull (dat, req, res) {
  var rs = dat.createReadStream({since: parseSince(req), binary: true})

  rs.on('error', oniniterror)
  rs.on('ready', function () {
    rs.removeListener('error', oniniterror)

    var encode = lpstream.encode()
    var gzipped = req.headers['accept-encoding'] === 'gzip'

    res.setHeader('X-Nodes', '' + rs.length)
    if (gzipped) res.setHeader('Content-Encoding', 'gzip')

    if (gzipped) pump(rs, encode, zlib.createGzip(), res)
    else pump(rs, encode, res)
  })

  function oniniterror (err) {
    onerror(err, res)
  }
}

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
