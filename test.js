var tape = require('tape')
var replicator = require('./')
var http = require('http')
var datGraph = require('dat-graph')
var memdb = require('memdb')

tape('empty', function (t) {
  var serverDat = datGraph(memdb())
  var clientDat = datGraph(memdb())

  var server = http.createServer(function (req, res) {
    replicator.server(serverDat, req, res)
  })

  server.listen(0, function () {
    replicator.client(clientDat, 'http://localhost:' + server.address().port, function (err) {
      server.close()
      t.error(err, 'no error')
      t.end()
    })
  })
})

tape('sync', function (t) {
  t.plan(3)

  var serverDat = datGraph(memdb())
  var clientDat = datGraph(memdb())

  var server = http.createServer(function (req, res) {
    replicator.server(serverDat, req, res)
  })

  serverDat.append('hello', function () {
    serverDat.append('world', function () {
      clientDat.append('verden', run)
    })
  })

  function run () {
    server.listen(0, function () {
      replicator.client(clientDat, 'http://localhost:' + server.address().port, function (err) {
        server.close()
        t.error(err, 'no error')
        matches(t, clientDat, ['hello', 'world', 'verden'])
        matches(t, serverDat, ['hello', 'world', 'verden'])
      })
    })
  }
})

tape('pull', function (t) {
  t.plan(3)

  var serverDat = datGraph(memdb())
  var clientDat = datGraph(memdb())

  var server = http.createServer(function (req, res) {
    replicator.server(serverDat, req, res)
  })

  serverDat.append('hello', function () {
    serverDat.append('world', function () {
      clientDat.append('verden', run)
    })
  })

  function run () {
    server.listen(0, function () {
      replicator.client(clientDat, 'http://localhost:' + server.address().port, {mode: 'pull'}, function (err) {
        server.close()
        t.error(err, 'no error')
        matches(t, clientDat, ['hello', 'world', 'verden'])
        matches(t, serverDat, ['hello', 'world'])
      })
    })
  }
})

tape('push', function (t) {
  t.plan(3)

  var serverDat = datGraph(memdb())
  var clientDat = datGraph(memdb())

  var server = http.createServer(function (req, res) {
    replicator.server(serverDat, req, res)
  })

  serverDat.append('hello', function () {
    serverDat.append('world', function () {
      clientDat.append('verden', run)
    })
  })

  function run () {
    server.listen(0, function () {
      replicator.client(clientDat, 'http://localhost:' + server.address().port, {mode: 'push'}, function (err) {
        server.close()
        t.error(err, 'no error')
        matches(t, clientDat, ['verden'])
        matches(t, serverDat, ['hello', 'world', 'verden'])
      })
    })
  }
})

function matches (t, dat, expected) {
  var datas = []
  var rs = dat.createReadStream()

  rs.on('data', function (data) {
    datas.push(data.value.toString())
  })

  rs.on('end', function () {
    t.same(expected.sort(), datas.sort(), 'dat contains expected data')
  })
}
