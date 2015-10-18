var http = require('http')
var concat = require('concat-stream')
var DAG = require('dat-graph')
var level = require('level')

var db = level('./server-data')
var dg = DAG(db)

var server = http.createServer(function (req, res) {
  if (req.url.match(/^\/diff/)) {
    console.log('/diff')
    var match = dg.createMatchStream({binary: true})
    match.once('data', function (buff) {
      console.log('sending matches:', buff.length, 'bytes')
      res.end(buff)
    })
    req.pipe(concat(function (buff) {
      match.end(buff)
    }))
    match.on('error', function (err) {
      console.log('match error', error)
      res.end()
    })
    req.on('error', function (err) {
      console.log('request error', err)
      res.end()
    })
    return
  }
  
  console.log('unknown route', req.url)
  res.end()
})

server.listen(8080, function (err) {
  if (err) throw err
  console.log('listening on 8080')
})
