
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
        , unsigned, signed, tampered, overwrite

      assert.equal( cookies.constructor, Cookies )

      if ( req.url == "/set" ) {
        cookies
          // set a regular cookie
          .set( "unsigned", "foo", { signed:false, httpOnly: false } )

          // set a signed cookie
          .set( "signed", "bar", { signed: true } )

          // mimic a signed cookie, but with a bogus signature
          .set( "tampered", "baz" )
          .set( "tampered.sig", "bogus" )

          // set a cookie that will be overwritten
          .set( "overwrite", "old-value", { signed: true } )
          .set( "overwrite", "new-value", { overwrite: true, signed: true } )

        res.writeHead( 302, { "Location": "/" } )
        return res.end( "Now let's check." )
      }

      unsigned = cookies.get( "unsigned" )
      signed = cookies.get( "signed", { signed: true } )
      tampered = cookies.get( "tampered", { signed: true } )
      overwrite = cookies.get( "overwrite", { signed: true } )

      assert.equal( unsigned, "foo" )
      assert.equal( cookies.get( "unsigned.sig", { signed:false } ), undefined)
      assert.equal( signed, "bar" )
      assert.equal( cookies.get( "signed.sig", { signed: false } ), keys.sign('signed=bar') )
      assert.notEqual( tampered, "baz" )
      assert.equal( tampered, undefined )
      assert.equal( overwrite, "new-value" )
      assert.equal( cookies.get( "overwrite.sig", { signed:false } ), keys.sign('overwrite=new-value') )

      assert.equal(res.getHeader('Set-Cookie'), 'tampered.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly')

      res.writeHead( 200, { "Content-Type": "text/plain" } )
      res.end(
        "unsigned expected: foo\n" +
        "unsigned actual: " + unsigned + "\n\n" +
        "signed expected: bar\n" +
        "signed actual: " + signed + "\n\n" +
        "tampered expected: undefined\n"+
        "tampered: " + tampered + "\n"
      )
    }).listen()
  })

  it('should set cookies', function (done) {
    request(server)
    .get('/set')
    .expect(302, function (err, res) {
      if (err) return done(err)

      header = res.headers['set-cookie']
      assert.equal(header.length, 7)
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
})

function createServer(proto, opts) {
  return http.createServer(function (req, res) {
    var cookies = new Cookies( req, res, opts )
    req.protocol = proto

    try {
      cookies.set( "foo", "bar", { "secure": true } )
    } catch (e) {
      res.statusCode = 500
      res.write(e.message)
    }

    res.end()
  })
}
