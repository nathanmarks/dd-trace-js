'use strict'

const ProtocolBase = require('./base')

const utils = require('./utils')

class Trace extends ProtocolBase {
  constructor (traceId, tracer) {
    super(Trace.BYTE_LENGTH, 0xdd01)
    this.id = traceId || utils.id()
    this._tracer = tracer
    this._active = new Set()
  }

  finish () {
    this._tracer._writer.write(this)
  }
}

Trace._makeAccessors({
  id: 'BigUint64'
})

module.exports = Trace
