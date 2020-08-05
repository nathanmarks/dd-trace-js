'use strict'

const strings = require('./strings')

const utils = require('./utils')

class Metas extends DataView {
  constructor () {
    const offset = utils.alloc(Metas.BYTE_LENGTH)
    super(utils.bufferPool, offset, Metas.BYTE_LENGTH)
    this.setUint16(0, 0xdd05)
  }

  static get BYTE_LENGTH () {
    return (32 * 2 * 8) + 3
  }

  add (key, value = '') {
    const currentLen = this.getUint8(2)
    if (currentLen === 32) {
      throw new Error('too many meta values')
    }

    key = strings.get(key)
    value = strings.get(value)
    this.setBigUint64(3 + (currentLen * 16), key)
    this.setBigUint64(3 + (currentLen * 16) + 8, value)
    this.setUint8(2, currentLen + 1)
  }

  getCurrentLen () {
    return this.getUint8(2)
  }

  [Symbol.for('nodejs.util.inspect.custom')] () {
    const obj = {}
    const len = this.getCurrentLen()
    for (let i = 0; i < len; i++) {
      const key = this.getBigUint64(3 + (i * 16))
      const value = this.getBigUint64(3 + (i * 16) + 8)
      obj[strings.revGet(key)] =
        strings.revGet(value)
    }
    return obj
  }
}

module.exports = Metas
