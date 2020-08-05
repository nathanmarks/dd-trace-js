'use strict'

Error.stackTraceLimit = Infinity

const ProtocolBase = require('./base')
const utils = require('./utils')

function now () {
  return process.hrtime.bigint()
}

class Span extends ProtocolBase {
  constructor ({ trace, parent, spanId }) {
    if (!trace) {
      throw new Error('span needs a trace')
    }
    super(Span.BYTE_LENGTH, 0xdd02)
    this.traceId = trace.id
    if (parent) this.parentId = parent.id
    this.id = spanId || utils.id()
    this.start = BigInt(Date.now()) * 1000n
    this._start = now()
    this._trace = trace
    this._trace._active.add(this)
  }

  getTrace() {
    return this._trace
  }

  finish () {
    this.duration = now() - this._start
    delete this._start
    this.tracer()._writer.write(this)
    this._trace._active.delete(this)
    if (!this._trace._active.size) {
      this._trace.finish()
    }
  }

  // TODO delete this (OT)
  addTags (tags) {
    for (const name in tags) {
      this.setTag(name, tags[name])
    }
  }

  // TODO this makes no sense, delete this (OT)
  context () {
    return this
  }

  tracer () {
    return this._trace._tracer
  }
}

Span._makeAccessors({
  id: 'BigUint64',
  parentId: 'BigUint64',
  traceId: 'BigUint64',
  start: 'BigUint64',
  duration: 'BigUint64',
  name: 'string',
  type: 'string',
  resource: 'string',
  service: 'string',
  error: 'bool'
})

module.exports = Span
