var events = require('events')
var util = require('util')

module.exports = Progress

function Progress () {
  if (!(this instanceof Progress)) return new Progress()
  events.EventEmitter.call(this)
  this.pulled = {transferred: 0, length: 0}
  this.pushed = {transferred: 0, length: 0}
}

util.inherits(Progress, events.EventEmitter)

Progress.prototype.pushInit = function (length) {
  this.pushed.length = length
  this.emit('push', this.pushed)
}

Progress.prototype.push = function () {
  this.pushed.transferred++
  this.emit('push', this.pushed)
}

Progress.prototype.pullInit = function (length) {
  this.pulled.length = length
  this.emit('pull', this.pulled)
}

Progress.prototype.pull = function () {
  this.pushed.transferred++
  this.emit('pull', this.pushed)
}

Progress.prototype.end = function (err) {
  if (err) this.emit('error', err)
  else this.emit('end')
}
