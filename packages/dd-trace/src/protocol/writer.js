'use strict'

const once = require('once')

const net = require('net')
const tls = require('tls')

const strings = require('./strings')

const BUFFER_MAX = 8 * 1024 * 1024

class Writer {
  constructor () {
    throw new Error('please use Writer.createWriter')
  }

  write (datum) {
    this.netClient.write(new Uint8Array(datum.buffer, datum.byteOffset, datum.byteLength))
    if (datum.metas) {
      this.write(datum.metas)
    }
    if (datum.metrics) {
      this.write(datum.metrics)
    }
    strings.flushQueue(this.netClient)
  }

  static createWriter (url, cb) {
    const { protocol, hostname, port } = url
    cb = once(cb)
    const writer = Object.create(Writer.prototype)
    const lib = protocol.startsWith('tls') ? tls : net
    writer.netClient = makeNetClient(writer, lib, port, hostname, cb)
  }
}

module.exports = Writer

function makeNetClient (writer, lib, port, hostname, cb) {
  const client = lib.connect(port, hostname, () => {
    writer.netClient = new NetClient(client)
    cb(null, writer)
  }).on('error', cb)
}

class NetClient {
  constructor (client) {
    this.client = client
    this.buf = Buffer.allocUnsafe(BUFFER_MAX)
    this.cursor = 0
  }

  _flush () {
    if (this.cursor === 0) return
    this.client.write(this.buf.slice(0, this.cursor))
    this.cursor = 0
  }

  write (datum) {
    if (this.cursor + datum.length > BUFFER_MAX) {
      this._flush()
    }
    this.buf.set(datum, this.cursor)
    this.cursor += datum.length
  }

  end () {
    this._flush()
    this.client.end()
  }
}
