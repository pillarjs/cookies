var assert = require('assert')
  , keys = require('keygrip')(['a', 'b'])
  , Cookies = require('../')
  , request = require('supertest')

var restify = tryRequire('restify')

var describeRestify = restify ? describe : describe.skip

describeRestify('Restify', function () {
  it('should set a cookie on the response', function (done) {
    var server = restify.createServer()

    server.get('/', function (req, res) {
      var cookies = new Cookies(req, res)

      cookies.set('foo', 'bar')

      res.send(200)
    })

    request(server)
      .get('/')
      .expect(shouldSetCookies([
        { name: 'foo', value: 'bar', path: '/', httponly: true }
      ]))
      .expect(200, done)
  })

  it('should get a cookie from the request', function (done) {
    var server = restify.createServer()

    server.get('/', function (req, res) {
      var cookies = new Cookies(req, res)

      res.send({ foo: String(cookies.get('foo')) })
    })

    request(server)
      .get('/')
      .set('cookie', 'foo=bar')
      .expect(200, { foo: 'bar' }, done)
  })

  describe('with multiple cookies', function () {
    it('should set all cookies on the response', function (done) {
      var server = restify.createServer()

      server.get('/', function (req, res) {
        var cookies = new Cookies(req, res)

        cookies.set('foo', 'bar')
        cookies.set('fizz', 'buzz')

        res.send(200)
      })

      request(server)
        .get('/')
        .expect(shouldSetCookies([
          { name: 'foo', value: 'bar', path: '/', httponly: true },
          { name: 'fizz', value: 'buzz', path: '/', httponly: true }
        ]))
        .expect(200, done)
    })

    it('should get each cookie from the request', function (done) {
      var server = restify.createServer()

      server.get('/', function (req, res) {
        var cookies = new Cookies(req, res)

        res.send({
          fizz: String(cookies.get('fizz')),
          foo: String(cookies.get('foo'))
        })
      })

      request(server)
        .get('/')
        .set('cookie', 'foo=bar; fizz=buzz')
        .expect(200, { foo: 'bar', fizz: 'buzz' }, done)
    })
  })

  describe('when "overwrite: false"', function () {
    it('should set second cookie with same name', function (done) {
      var server = restify.createServer()

      server.get('/', function (req, res) {
        var cookies = new Cookies(req, res)

        cookies.set('foo', 'bar')
        cookies.set('foo', 'fizz', { overwrite: false })

        res.send(200)
      })

      request(server)
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
      var server = restify.createServer()

      server.get('/', function (req, res) {
        var cookies = new Cookies(req, res)

        cookies.set('foo', 'bar')
        cookies.set('foo', 'fizz', { overwrite: true })

        res.send(200)
      })

      request(server)
        .get('/')
        .expect(shouldSetCookies([
          { name: 'foo', value: 'fizz', path: '/', httponly: true }
        ]))
        .expect(200, done)
    })

    it('should set signature correctly', function (done) {
      var server = restify.createServer()

      server.get('/', function (req, res) {
        var cookies = new Cookies(req, res, keys)

        cookies.set('foo', 'bar')
        cookies.set('foo', 'fizz', { overwrite: true })

        res.send(200)
      })

      request(server)
        .get('/')
        .expect(shouldSetCookies([
          { name: 'foo', value: 'fizz', path: '/', httponly: true },
          { name: 'foo.sig', value: 'hVIYdxZSelh3gIK5wQxzrqoIndU', path: '/', httponly: true }
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
