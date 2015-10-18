var DAG = require('dat-graph')
var level = require('level')
var crypto = require('crypto')

var dbname = process.argv[2]
if (!dbname) return
var db = level(dbname)
var dg = DAG(db)
  
var count = 0

insert()

function insert () {
  dg.append(crypto.randomBytes(256), function (err, node) {
    if (err) throw err
    if (++count === 10000) return
    insert()
  })
}
