var http = require('http')
var https = require('https')
var zlib = require('zlib')
var parseUrl = require('url').parse

var pump = require('pump')
var xtend = require('xtend')

module.exports = function (opts, cb) {
  if (typeof opts === 'undefined') throw new Error('Must supply url')
  if (typeof cb === 'undefined') throw new Error('Must supply callback')
  if (typeof opts === 'string') opts = {url: opts}
  var url = opts.url
  delete opts.url

  if (!/:\/\//.test(url)) url = 'http://' + url

  var parsed = parseUrl(url)
  var host = parsed.hostname
  var port = parsed.port
  var name = parsed.pathname || '/'
  var mod = parsed.protocol === 'https:' ? https : http
    
  var defaults = {
    method: 'GET',
    host: host,
    port: port
  }
  
  var req = mod.request(xtend(defaults, opts))

  req.on('error', function (err) {
    return cb(err)
  })
  
  req.on('response', function (res) {
    var gzipped = res.headers['content-encoding'] === 'gzip'
    if (gzipped) {
      var gunzip = zlib.createGunzip()
      pump(decode, gunzip)
      cb(null, gunzip)
    } else {
      cb(null, res)      
    }
  })
  
  return req
}
