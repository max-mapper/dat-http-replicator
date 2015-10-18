# dat-http-replicator

```
# set up client with 10k and server fork with 20k
node random-data.js client-data
cp -R client-data server-data
node random-data.js server-data

# start server
node test-server.js

# run client
node test-client.js
```