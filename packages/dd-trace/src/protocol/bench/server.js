'use strict'

const net = require('net')
const http = require('http')

const Decoder = require('../decoder')
require('../strings').init(1024)
const decoder = new Decoder()
const server = net.createServer(socket => socket.pipe(decoder)).listen(3117, () => {
})
// setInterval(() => console.log(decoder), 5000)

http.createServer(async (req, res) => {
  res.statusCode = 200
  if (await streamLen(req) > 0) {
    res.write(JSON.stringify({ rate_by_service: { 'service:,env:': 1 } }))
  }
  res.end()
}).listen(8126, 'localhost', () => {})

async function streamLen (strm) {
  try {
    let len = 0
    for await (const buf of strm) {
      len += buf.length
    }
    return len
  } catch (e) {
    return 0
  }
}
