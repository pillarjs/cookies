
var assert = require('assert')
var Cookies = require('..')
var http = require('http')
var request = require('supertest')

describe('new Cookies(req, res, [options])', function () {
  it('should create new cookies instance', function (done) {
    request(createServer(function (req, res, cookies) {
      assert.ok(cookies)
      assert.equal(cookies.constructor, Cookies)
      res.end('OK')
    }))
    .get('/')
    .expect(200, 'OK', done)
  })

  describe('.set(name, value, [options])', function () {
    it('should set cookie', function (done) {
      request(createServer(function (req, res, cookies) {
        cookies.set('foo', 'bar')
        res.end()
      }))
      .get('/')
      .expect(200)
      .expect(shouldSetCookieToValue('foo', 'bar'))
      .end(done)
    })

    describe('"domain" option', function () {
      it('should not be set by default', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar')
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieWithoutAttribute('foo', 'domain'))
        .end(done)
      })

      it('should set to custom value', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar', { domain: 'foo.local' })
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieWithAttributeAndValue('foo', 'domain', 'foo.local'))
        .end(done)
      })

      it('should reject invalid value', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar', { domain: 'foo\nbar' })
          res.end()
        }))
        .get('/')
        .expect(500, 'TypeError: option domain is invalid', done)
      })
    })

    describe('"path" option', function () {
      it('should default to "/"', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar')
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieWithAttributeAndValue('foo', 'path', '/'))
        .end(done)
      })

      it('should set to custom value', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar', { path: '/admin' })
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieWithAttributeAndValue('foo', 'path', '/admin'))
        .end(done)
      })

      it('should reject invalid value', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar', { path: 'foo\nbar' })
          res.end()
        }))
        .get('/')
        .expect(500, 'TypeError: option path is invalid', done)
      })
    })
  })
})

function cookie (res) {
  var setCookie = res.headers['set-cookie']
  return (setCookie && setCookie[0]) || undefined
}

function createServer (options, handler) {
  var next = handler || options
  var opts = next === options ? undefined : options

  return http.createServer(function (req, res) {
    var cookies = new Cookies(req, res, opts)

    try {
      next(req, res, cookies)
    } catch (e) {
      res.statusCode = 500
      res.end(e.name + ': ' + e.message)
    }
  })
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

function shouldSetCookieToValue (name, val) {
  return function (res) {
    var header = cookie(res)
    var data = header && parseSetCookie(header)
    assert.ok(header, 'should have a cookie header')
    assert.equal(data.name, name, 'should set cookie ' + name)
    assert.equal(data.value, val, 'should set cookie ' + name + ' to ' + val)
  }
}

function shouldSetCookieWithAttributeAndValue (name, attrib, value) {
  return function (res) {
    var header = cookie(res)
    var data = header && parseSetCookie(header)
    assert.ok(header, 'should have a cookie header')
    assert.equal(data.name, name, 'should set cookie ' + name)
    assert.ok((attrib.toLowerCase() in data), 'should set cookie with attribute ' + attrib)
    assert.equal(data[attrib.toLowerCase()], value, 'should set cookie with attribute ' + attrib + ' set to ' + value)
  }
}

function shouldSetCookieWithoutAttribute (name, attrib) {
  return function (res) {
    var header = cookie(res)
    var data = header && parseSetCookie(header)
    assert.ok(header, 'should have a cookie header')
    assert.equal(data.name, name, 'should set cookie ' + name)
    assert.ok(!(attrib.toLowerCase() in data), 'should set cookie without attribute ' + attrib)
  }
}
