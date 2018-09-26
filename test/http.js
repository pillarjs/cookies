
var http = require('http')
  , keys = require( "keygrip" )(['a', 'b'])
  , Cookies = require( "../" )
  , request = require('supertest')

describe('HTTP', function () {
  describe('with "secure" option', function () {
    it('should check connection when undefined; unencrypted', function (done) {
      request(createServer( "http", { "keys": keys } ))
      .get('/')
      .expect(500, 'Cannot send secure cookie over unencrypted connection', done)
    })

    it('should check connection when undefined; encrypted', function (done) {
      request(createServer( "https", { "keys": keys } ))
      .get('/')
      .expect(200, done)
    })

    it('should not check connection when defined; true', function (done) {
      request(createServer( "http", { "keys": keys, "secure": true } ))
      .get('/')
      .expect(200, done)
    })

    it('should not check connection when defined; false', function (done) {
      request(createServer( "https", { "keys": keys, "secure": false } ))
      .get('/')
      .expect(500, 'Cannot send secure cookie over unencrypted connection', done)
    })
  })

  describe('with array "keys" options', function () {
    it('should create keygrip with options.keys', function (done) {
      request(createServer( "http", { "keys": ['a', 'b'], "secure": true } ))
      .get('/')
      .expect(200, done)
    })
  })

  describe('with array argument', function () {
    it('should create keygrip with options.keys', function (done) {
      request(createServer('https', ['a', 'b']))
      .get('/')
      .expect('Set-Cookie', /foo=bar/)
      .expect(200, done)
    })
  })
})

function createServer(proto, opts) {
  return http.createServer(function (req, res) {
    var cookies = new Cookies( req, res, opts )
    req.protocol = proto

    try {
      cookies.set( "foo", "bar", { "secure": true, signed: true } )
    } catch (e) {
      res.statusCode = 500
      res.write(e.message)
    }

    res.end()
  })
}
