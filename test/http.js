
var assert = require( "assert" )
  , http = require( "http" )
  , keys = require( "keygrip" )(['a', 'b'])
  , Cookies = require( "../" )
  , request = require('supertest')

function startsWith(str, searchString) {
  return str.substr(0, searchString.length) === searchString;
}

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

          // set a cookie as samesite
          .set( "samesite", "qux", { sameSite: true, signed: false })
          .set( "samesite-lax", "quux", { sameSite: 'Lax', signed: false })
          .set( "samesite-strict", "corge", { sameSite: 'Strict', signed: false })
          .set( "samesite-lax-case", "grault", { sameSite: 'laX', signed: false })

        res.writeHead( 302, { "Location": "/" } )
        return res.end( "Now let's check." )
      }

      unsigned = cookies.get( "unsigned" )
      signed = cookies.get( "signed", { signed: true } )
      tampered = cookies.get( "tampered", { signed: true } )
      overwrite = cookies.get( "overwrite", { signed: true } )
      samesite = cookies.get( "samesite" )
      samesiteLax = cookies.get( "samesite-lax" )
      samesiteStrict = cookies.get( "samesite-strict" )

      assert.equal( unsigned, "foo" )
      assert.equal( cookies.get( "unsigned.sig", { signed:false } ), undefined)
      assert.equal( signed, "bar" )
      assert.equal( cookies.get( "signed.sig", { signed: false } ), keys.sign('signed=bar') )
      assert.notEqual( tampered, "baz" )
      assert.equal( tampered, undefined )
      assert.equal( overwrite, "new-value" )
      assert.equal( cookies.get( "overwrite.sig", { signed:false } ), keys.sign('overwrite=new-value') )
      assert.equal( samesite, "qux" )
      assert.equal( samesiteLax, "quux" )
      assert.equal( samesiteStrict, "corge" )

      assert.equal(res.getHeader('Set-Cookie'), 'tampered.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly')

      res.writeHead( 200, { "Content-Type": "text/plain" } )
      res.end(
        "unsigned expected: foo\n" +
        "unsigned actual: " + unsigned + "\n\n" +
        "signed expected: bar\n" +
        "signed actual: " + signed + "\n\n" +
        "tampered expected: undefined\n"+
        "tampered: " + tampered + "\n\n" +
        "samesite expected: qux\n" +
        "samesite actual: " + samesite + "\n\n" +
        "samesiteLax expected: quux\n" +
        "samesiteLax actual: " + samesiteLax + "\n\n" +
        "samesiteStrict expected: corge\n" +
        "samesiteStrict actual: " + samesiteStrict + "\n"
      )
    }).listen()
  })

  it('should set cookies', function (done) {
    request(server)
    .get('/set')
    .expect(302, function (err, res) {
      if (err) return done(err)

      header = res.headers['set-cookie']
      assert.equal(header.length, 11)
      done()
    })
  })

  it('should set samesite flag', function () {
    var samesite, samesiteLax, samesiteStrict, samesiteLaxCase;
    header.forEach(function(content) {
      if (startsWith(content, 'samesite=')) {
        samesite = content;
      } else if (startsWith(content, 'samesite-lax=')) {
        samesiteLax = content;
      } else if (startsWith(content, 'samesite-strict=')) {
        samesiteStrict = content;
      } else if (startsWith(content, 'samesite-lax-case=')) {
        samesiteLaxCase = content;
      }
    })

    assert.equal(samesite, 'samesite=qux; path=/; httponly; SameSite')
    assert.equal(samesiteLax, 'samesite-lax=quux; path=/; httponly; SameSite=Lax')
    assert.equal(samesiteStrict, 'samesite-strict=corge; path=/; httponly; SameSite=Strict')
    assert.equal(samesiteLaxCase, 'samesite-lax-case=grault; path=/; httponly; SameSite=Lax')
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
