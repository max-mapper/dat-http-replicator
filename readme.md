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
  replicator.server(datGraphInstance, req, res)
})

server.listen(9000)
```

On a client

``` js
var replicator = require('dat-http-replicator')
var progress = replicator(datGraphInstance, 'http://localhost:9000')

progress.on('pull', function () {
  console.log('pulled', progress.pulled)
})

progress.on('push', function () {
  console.log('pushed', progress.pushed)
})

progress.on('end', function () {
  console.log('done replicating')
})

progress.on('error', function (err) {
  console.log('error!', err)
})
```

## API

#### `replicator.server(datGraphInstance, req, res, [opts])`

Setup a server http handler. Options include:

``` js
{
  readonly: true, // do not allow pushes
  writeonly: true // do not allow pulls
}
```

#### `progress = replicator.client(datGraphInstance, url, [opts], [callback])`

Make a replication request. Options include:

``` js
{
  mode: 'push' | 'pull' | 'sync' // defaults to sync
}
```

The progress monitor returned will emit `push` and `pull` when you send a graph node
or receive a graph node. The progress events look like this

``` js
{
  transferred: nodesTransferredSoFar,
  length: totalNumberOfNodesToTransfer
}
```

The latest progress event call also be accessed at `progress.pushed` and `progress.pulled`
