var concat = require('concat-stream')
var DAG = require('dat-graph')
var level = require('level')
var request = require('request')

var db = level('./client-data')
var dg = DAG(db)

var testServer = 'http://localhost:8080'

var diff = dg.createDiffStream({binary: true})
var ended = false
diff.on('end', function () { ended = true })

getDiff()

function getDiff () {
  if (ended) {
    return console.log('since:', diff.since)
  }
  diff.once('data', function (buff) {
    request.post(testServer + '/diff', {body: buff, encoding: null}, function (err, res, data) {
      console.log('POST /diff response:', data.length, 'bytes')
      diff.write(data)
      process.nextTick(getDiff)
    })
  })
}

