var assert = require('assert')
  , keys = require('keygrip')(['a', 'b'])
  , Cookies = require('../')
  , request = require('supertest')

var restify = tryRequire('restify')

var describeRestify = restify ? describe : describe.skip

describeRestify('Restify', function () {
  var header
  var server

  before(function (done) {
    server = restify.createServer()

    server.get('/set', function (req, res) {
      setCookies(req, res)
      res.json({ status : 'ok'})
    })

    server.get('/get', function (req, res) {
      assertCookies(req, res)
      res.send(200)
    })

    server.listen(done)
  })

  after(function (done) {
    server.close(done)
  })

  it('should set cookies', function (done) {
    request(server)
    .get('/set')
    .expect(200, function (err, res) {
      if (err) return done(err)

      header = res.headers['set-cookie']
      assertSetCookieHeader(header)
      done()
    })
  })

  it('should get cookies', function (done) {
    request(server)
    .get('/get')
    .set('Cookie', header.join(';'))
    .expect(200, done)
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

function setCookies(req, res) {
  var cookies = new Cookies(req, res, keys)
  cookies
    .set('unsigned', 'foo', { signed:false, httpOnly: false })
    .set('signed', 'bar', { signed: true })
}

function assertCookies(req, res) {
  var cookies = new Cookies(req, res, keys)
  var unsigned = cookies.get('unsigned'),
    signed = cookies.get('signed', { signed: true })

  assert.equal(unsigned, 'foo')
  assert.equal(cookies.get('unsigned.sig', { signed:false }), undefined)
  assert.equal(signed, 'bar')
  assert.equal(cookies.get('signed.sig', { signed: false }), keys.sign('signed=bar'))
}

function assertSetCookieHeader(header) {
  assert.equal(header.length, 3)
  assert.equal(header[0], 'unsigned=foo; path=/')
  assert.equal(header[1], 'signed=bar; path=/; httponly')
  assert.ok(/^signed\.sig=.{27}; path=\/; httponly$/.test(header[2]))
}

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
