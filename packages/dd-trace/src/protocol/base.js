'use strict'

const Metas = require('./metas')
const Metrics = require('./metrics')

const utils = require('./utils')
const strings = require('./strings')

const configurable = true
const enumerable = true

function sizeOf (type) {
  return Number(type.replace(/.*nt/, '')) / 8
}

class ProtocolBase extends DataView {
  constructor (byteLength, magic) {
    const offset = utils.alloc(byteLength)
    super(utils.bufferPool, offset, byteLength)
    this.setUint16(0, magic)
  }

  addMetric (key, value) {
    if (!this.metrics) {
      this.metrics = new Metrics()
    }
    this.metrics.add(key, value)
  }

  addMeta (key, value) {
    if (!this.metas) {
      this.metas = new Metas()
    }
    this.metas.add(key, value)
  }

  setTag (key, value) {
    if (key in this.constructor._accessors) {
      this[key] = value
    } else {
      if (typeof value === 'number') {
        this.addMetric(key, value)
      } else {
        this.addMeta(key, value)
      }
    }
  }

  [Symbol.for('nodejs.util.inspect.custom')] () {
    const obj = {}
    for (const key in this) {
      obj[key] = this[key]
    }
    return obj
  }

  static _makeAccessors (accessorList) {
    this._accessors = accessorList
    let offset = 2 // magic number fits here
    for (const key in accessorList) {
      const valType = accessorList[key]
      const valOffset = offset
      let get
      let set
      if (valType === 'string') {
        get = function () {
          return strings.revGet(this.getBigUint64(valOffset))
        }
        set = function (val) {
          this.setBigUint64(valOffset, strings.get(val))
        }
        offset += 8
      } else if (valType === 'bool') {
        get = function () {
          return !!this.getUint8(valOffset)
        }
        set = function (val) {
          this.setUint8(valOffset, val ? 1 : 0)
        }
        offset += 1
      } else {
        const getterName = 'get' + valType
        const setterName = 'set' + valType
        get = function () {
          return this[getterName](valOffset)
        }
        set = function (val) {
          this[setterName](valOffset, val)
        }
        offset += sizeOf(valType)
      }
      Object.defineProperty(this.prototype, key, { get, set, enumerable, configurable })
      if (
        (this.constructor.name === 'Trace' && key === 'id') ||
        key === 'traceId'
      ) {
        offset += 8 // traceId is double-sized, to account for future 128-bit IDs
      }
    }

    Object.defineProperty(this, 'BYTE_LENGTH', { value: offset })
  }
}

module.exports = ProtocolBase
