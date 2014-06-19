
http = require('http')
assert = require('assert')
request = require('supertest')

Cookies = require('..')(['asdf', 'qwer'])

server = null

serve = function serve(app) {
  if (server) server.close()
  server = http.createServer(app).listen()
}

require('./raw')
require('./encoded')
require('./encrypted')
require('./signed')
