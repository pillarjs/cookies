
var assert = require( "assert" )
  , express = require( "express" )
  , http = require( "http" )
  , keys = require( "keygrip" )(['a', 'b'])
  , cookies = require( "../" ).express
  , request = require('supertest')

if(process.env.EXPOSE_HTTP2){
  http = require( "http2" )
}

describe('Express', function () {
  var server
  var header

  before(function setup() {
    var app = express()

    app.use( cookies( keys ) )

    app.get( "/set", function(req, res) {
      res.cookies
        // set a regular cookie
        .set( "unsigned", "foo", { signed:false, httpOnly: false } )

        // set an empty cookie
        .set( "empty", "", { signed: false, httpOnly: false } )

        // set a signed cookie
        .set( "signed", "bar", { signed: true } )

        // mimic a signed cookie, but with a bogus signature
        .set( "tampered", "baz" )
        .set( "tampered.sig", "bogus" )

        // set a cookie that will be overwritten
        .set( "overwrite", "old-value", { signed: true } )
        .set( "overwrite", "new-value", { overwrite: true, signed: true } )

      res.writeHead(302, {Location: "/"})
      res.end()
    })

    app.get("/", function(req, res) {
      var unsigned = req.cookies.get( "unsigned" )
        , signed = req.cookies.get( "signed", { signed: true } )
        , tampered = req.cookies.get( "tampered", { signed: true } )
        , overwrite = req.cookies.get( "overwrite", { signed: true } )

      assert.equal( unsigned, "foo" )
      assert.equal( req.cookies.get( "unsigned.sig", { signed:false } ), undefined)
      assert.equal( signed, "bar" )
      assert.equal( req.cookies.get( "signed.sig", { signed: false } ), keys.sign('signed=bar') )
      assert.notEqual( tampered, "baz" )
      assert.equal( tampered, undefined )
      assert.equal( overwrite, "new-value" )
      assert.equal( req.cookies.get( "overwrite.sig", { signed:false } ), keys.sign('overwrite=new-value') )

      assert.equal(res.getHeader('Set-Cookie'), 'tampered.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly')

      res.send(
        "unsigned expected: foo\n" +
        "unsigned actual: " + unsigned + "\n\n" +
        "signed expected: bar\n" +
        "signed actual: " + signed + "\n\n" +
        "tampered expected: undefined\n"+
        "tampered: " + tampered + "\n"
      )
    })

    server = http.createServer(app).listen()
  })

  it('should set cookies', function (done) {
    request(server)
    .get('/set')
    .expect(302, function (err, res) {
      if (err) return done(err)

      header = res.headers['set-cookie']
      assert.equal(header.length, 8)
      done()
    })
  })

  it('should get cookies', function (done) {
    request(server)
    .get('/')
    .set('Cookie', header.join(';'))
    .expect(200, done)
  })

  describe('when "secure: true"', function () {
    it('should not set when not secure', function (done) {
      var app = express()

      app.set('env', 'test')
      app.use(cookies(keys))
      app.use(function (req, res) {
        res.cookies.set('foo', 'bar', {secure: true})
        res.end()
      })

      request(app)
      .get('/')
      .expect(500, /Cannot send secure cookie over unencrypted connection/, done)
    })

    it('should set for secure connection', function (done) {
      var app = express()

      app.set('env', 'test')
      app.use(cookies(keys))
      app.use(function (req, res, next) {
        res.connection.encrypted = true
        next()
      })
      app.use(function (req, res) {
        res.cookies.set('foo', 'bar', {secure: true})
        res.end()
      })

      request(app)
      .get('/')
      .expect('Set-Cookie', /foo=bar.*secure/i)
      .expect(200, done)
    })

    it('should set for proxy settings', function (done) {
      var app = express()

      app.set('env', 'test')
      app.set('trust proxy', true)
      app.use(cookies(keys))
      app.use(function (req, res) {
        res.cookies.set('foo', 'bar', {secure: true})
        res.end()
      })

      request(app)
      .get('/')
      .set('X-Forwarded-Proto', 'https')
      .expect('Set-Cookie', /foo=bar.*secure/i)
      .expect(200, done)
    })
  })
})
