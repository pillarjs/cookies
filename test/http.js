
var assert = require( "assert" )
  , http = require( "http" )
  , keys = require( "keygrip" )(['a', 'b'])
  , Cookies = require( "../" )
  , request = require('supertest')

describe('HTTP', function () {
  var server
  var header

  before(function setup() {
    server = http.createServer( function( req, res ) {
      var cookies = new Cookies( req, res, keys )
        , unsigned, signed

      assert.equal( cookies.constructor, Cookies )

      if ( req.url == "/set" ) {
        cookies
          // set a regular cookie
          .set( "unsigned", "foo", { signed:false, httpOnly: false } )

          // set a signed cookie
          .set( "signed", "bar", { signed: true } )

          // set a secure cookie
          .set( "sec", "yes", { secureProxy: true } )

        res.writeHead( 302, { "Location": "/" } )
        return res.end( "Now let's check." )
      }

      unsigned = cookies.get( "unsigned" )
      signed = cookies.get( "signed", { signed: true } )

      assert.equal( unsigned, "foo" )
      assert.equal( cookies.get( "unsigned.sig", { signed:false } ), undefined)
      assert.equal( signed, "bar" )
      assert.equal( cookies.get( "signed.sig", { signed: false } ), keys.sign('signed=bar') )

      res.writeHead( 200, { "Content-Type": "text/plain" } )
      res.end(
        "unsigned expected: foo\n" +
        "unsigned actual: " + unsigned + "\n\n" +
        "signed expected: bar\n" +
        "signed actual: " + signed + "\n"
      )
    }).listen()
  })

  it('should set cookies', function (done) {
    request(server)
    .get('/set')
    .expect(302, function (err, res) {
      if (err) return done(err)

      header = res.headers['set-cookie']
      assert.equal(header.length, 5)
      done()
    })
  })

  it('should get cookies', function (done) {
    request(server)
    .get('/')
    .set('Cookie', header.join(';'))
    .expect(200, done)
  })

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
