var http = require('http')
var https = require('https')
var parseUrl = require('url').parse
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
  var path = parsed.path
  var mod = parsed.protocol === 'https:' ? https : http

  var defaults = {
    method: 'GET',
    host: host,
    path: path,
    port: port
  }

  var reqOpts = xtend(defaults, opts)
  var req = mod.request(reqOpts)

  req.on('error', function (err) {
    return cb(err)
  })

  req.on('response', function (res) {
    cb(null, res)
  })

  return req
}
