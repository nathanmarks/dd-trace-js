'use strict'

const Scope = require('../scope/async_local_storage')
const Writer = require('./writer')
const Span = require('./span')
const Trace = require('./trace')
const strings = require('./strings')
const tags = require('../../../../ext/tags')

const SPAN_TYPE = tags.SPAN_TYPE
const RESOURCE_NAME = tags.RESOURCE_NAME
const SERVICE_NAME = tags.SERVICE_NAME
const ANALYTICS = tags.ANALYTICS

class Tracer {
  constructor (config) {
    strings.init(1024)
    this._config = config
    this._scope = new Scope(config)
    Writer.createWriter(config.agent, (err, writer) => {
      if (err) throw err
      this._writer = writer

      setInterval(() => {
        this._writer.netClient._flush()
      }, 2000)
    })
  }

  trace (name, options, fn) {
    options = Object.assign({}, {
      childOf: this._scope.active()
    }, options)

    if (!options.childOf && options.orphanable === false) {
      return fn(null, () => {})
    }

    const span = this.startSpan(name, options)

    addTags(span, options)

    try {
      if (fn.length > 1) {
        return this._scope.activate(span, () => fn(span, err => {
          addError(span, err)
          span.finish()
        }))
      }

      const result = this._scope.activate(span, () => fn(span))

      if (result && typeof result.then === 'function') {
        result.then(
          () => span.finish(),
          err => {
            addError(span, err)
            span.finish()
          }
        )
      } else {
        span.finish()
      }

      return result
    } catch (e) {
      addError(span, e)
      span.finish()
      throw e
    }
  }

  wrap (name, options, fn) {
    const tracer = this

    return function () {
      if (typeof options === 'function' && typeof fn === 'function') {
        options = options.apply(this, arguments)
      }

      if (options.orphanable === false && !tracer._scope.active()) {
        return fn.apply(this, arguments)
      }

      const lastArgId = arguments.length - 1
      const cb = arguments[lastArgId]

      if (typeof cb === 'function') {
        const scopeBoundCb = tracer._scope.bind(cb)
        return tracer.trace(name, options, (span, done) => {
          arguments[lastArgId] = function (err) {
            done(err)
            return scopeBoundCb.apply(this, arguments)
          }

          return fn.apply(this, arguments)
        })
      } else {
        return tracer.trace(name, options, () => fn.apply(this, arguments))
      }
    }
  }

  startSpan (name, options) {
    const parent = options.childOf
    let trace
    if (parent) {
      trace = parent.getTrace()
    } else {
      trace = new Trace(null, this)
    }
    const span = new Span({ trace, parent })

    span.name = name // TODO typecheck

    return span
  }

  scope () {
    return this._scope
  }

  inject () {
    // TODO
  }

  extract () {
    // TODO
  }
}

function addTags (span, options) {
  const tags = {}

  if (options.type) tags[SPAN_TYPE] = options.type
  if (options.service) tags[SERVICE_NAME] = options.service
  if (options.resource) tags[RESOURCE_NAME] = options.resource

  tags[ANALYTICS] = options.analytics

  span.addTags(tags)
}

function addError (span, error) {
  if (error && error instanceof Error) {
    span.addTags({
      'error.type': error.name,
      'error.msg': error.message,
      'error.stack': error.stack
    })
  }
}

module.exports = Tracer
