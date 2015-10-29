# dat-http-replicator

```
npm install dat-http-replicator
```

[![build status](http://img.shields.io/travis/maxogden/dat-http-replicator.svg?style=flat)](http://travis-ci.org/maxogden/dat-http-replicator)

## Usage

On a server

``` js
var replicator = require('dat-http-replicator')
var http = require('http')

var server = http.createServer(function (req, res) {
  var progress = replicator.server(datGraphInstance, req, res)
  if (!progress) return

  progress.on('pull', function () {
    console.log('server pulled', progress.pulled)
  })

  progress.on('push', function () {
    console.log('server pushed', progress.pushed)
  })
})

server.listen(9000)
```

On a client

``` js
var replicator = require('dat-http-replicator')
var progress = replicator(datGraphInstance, 'http://localhost:9000')

progress.on('pull', function () {
  console.log('client pulled', progress.pulled)
})

progress.on('push', function () {
  console.log('client pushed', progress.pushed)
})

progress.on('end', function () {
  console.log('done replicating')
})

progress.on('error', function (err) {
  console.log('error!', err)
})
```

## API

#### `progress = replicator.server(datGraph, req, res, [opts], [cb])`

Setup a server http handler. Options include:

``` js
{
  readonly: true, // do not allow pushes
  writeonly: true // do not allow pulls
}
```

Note that the progress monitor will be `null` if this is an endpoint
without progress monitoring support.

#### `progress = replicator.client(datGraph, url, [opts], [cb])`

Make a replication request. Options include:

``` js
{
  mode: 'push' | 'pull' | 'sync' // defaults to sync
}
```

## Progress monitoring

The progress monitor returned will emit `push` and `pull` when you send a graph node
or receive a graph node. The progress events look like this

``` js
{
  transferred: nodesTransferredSoFar,
  length: totalNumberOfNodesToTransfer
}
```

The latest progress event call also be accessed at `progress.pushed` and `progress.pulled`
