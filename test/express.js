
var assert = require( "assert" )
  , keys = require( "keygrip" )(['a', 'b'])
  , cookies = require( "../" ).express
  , request = require('supertest')

var express = tryRequire('express')

var describeExpress = express ? describe : describe.skip

describeExpress('Express', function () {
  var server
  var header

  before(function (done) {
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

      res.writeHead(302, {Location: "/"})
      res.end()
    })

    app.get("/", function(req, res) {
      var unsigned = req.cookies.get( "unsigned" )
        , signed = req.cookies.get( "signed", { signed: true } )

      assert.equal( unsigned, "foo" )
      assert.equal( req.cookies.get( "unsigned.sig", { signed:false } ), undefined)
      assert.equal( signed, "bar" )
      assert.equal( req.cookies.get( "signed.sig", { signed: false } ), keys.sign('signed=bar') )

      res.send(
        "unsigned expected: foo\n" +
        "unsigned actual: " + unsigned + "\n\n" +
        "signed expected: bar\n" +
        "signed actual: " + signed + "\n\n"
      )
    })

    server = app.listen(done)
  })

  after(function (done) {
    server.close(done)
  })

  it('should set cookies', function (done) {
    request(server)
    .get('/set')
    .expect(302, function (err, res) {
      if (err) return done(err)

      header = res.headers['set-cookie']
      assert.equal(header.length, 4)
      done()
    })
  })

  it('should get cookies', function (done) {
    request(server)
    .get('/')
    .set('Cookie', header.join(';'))
    .expect(200, done)
  })

  describe('when "overwrite: false"', function () {
    it('should set second cookie with same name', function (done) {
      var app = express()

      app.set('env', 'test')
      app.use(cookies())
      app.get('/', function (req, res) {
        res.cookies.set('foo', 'bar')
        res.cookies.set('foo', 'fizz', { overwrite: false })
        res.end()
      })

      request(app)
        .get('/')
        .expect(shouldSetCookies([
          { name: 'foo', value: 'bar', path: '/', httponly: true },
          { name: 'foo', value: 'fizz', path: '/', httponly: true }
        ]))
        .expect(200, done)
    })
  })

  describe('when "overwrite: true"', function () {
    it('should replace previously set value', function (done) {
      var app = express()

      app.set('env', 'test')
      app.use(cookies())
      app.get('/', function (req, res, next) {
        res.cookies.set('foo', 'bar')
        res.cookies.set('foo', 'fizz', { overwrite: true })
        res.end()
      })

      request(app)
        .get('/')
        .expect(shouldSetCookies([
          { name: 'foo', value: 'fizz', path: '/', httponly: true }
        ]))
        .expect(200, done)
    })

    it('should set signature correctly', function (done) {
      var app = express()

      app.set('env', 'test')
      app.use(cookies(keys))
      app.get('/', function (req, res, next) {
        res.cookies.set('foo', 'bar')
        res.cookies.set('foo', 'fizz', { overwrite: true })
        res.end()
      })

      request(app)
        .get('/')
        .expect(shouldSetCookies([
          { name: 'foo', value: 'fizz', path: '/', httponly: true },
          { name: 'foo.sig', value: 'hVIYdxZSelh3gIK5wQxzrqoIndU', path: '/', httponly: true }
        ]))
        .expect(200, done)
    })
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
        .expect(shouldSetCookies([
          { name: 'foo', value: 'bar', path: '/', httponly: true, secure: true },
          { name: 'foo.sig', value: 'p5QVCZeqNBulWOhYipO0jqjrzz4', path: '/', httponly: true, secure: true }
        ]))
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
        .expect(shouldSetCookies([
          { name: 'foo', value: 'bar', path: '/', httponly: true, secure: true },
          { name: 'foo.sig', value: 'p5QVCZeqNBulWOhYipO0jqjrzz4', path: '/', httponly: true, secure: true }
        ]))
        .expect(200, done)
    })
  })
})

function getCookies (res) {
  var setCookies = res.headers['set-cookie'] || []
  return setCookies.map(parseSetCookie)
}

function parseSetCookie (header) {
  var match
  var pairs = []
  var pattern = /\s*([^=;]+)(?:=([^;]*);?|;|$)/g

  while ((match = pattern.exec(header))) {
    pairs.push({ name: match[1], value: match[2] })
  }

  var cookie = pairs.shift()

  for (var i = 0; i < pairs.length; i++) {
    match = pairs[i]
    cookie[match.name.toLowerCase()] = (match.value || true)
  }

  return cookie
}

function shouldSetCookies (expected) {
  return function (res) {
    assert.deepEqual(getCookies(res), expected)
  }
}

function tryRequire (name) {
  try {
    return require(name)
  } catch (e) {
    return undefined
  }
}
