
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

  describe('.get(name, [options])', function () {
    it('should return value of cookie', function (done) {
      request(createServer(function (req, res, cookies) {
        res.end(String(cookies.get('foo')))
      }))
      .get('/')
      .set('Cookie', 'foo=bar')
      .expect(200, 'bar', done)
    })

    it('should work for cookie name with special characters', function (done) {
      request(createServer(function (req, res, cookies) {
        res.end(String(cookies.get('foo*(#bar)?.|$')))
      }))
      .get('/')
      .set('Cookie', 'foo*(#bar)?.|$=buzz')
      .expect(200, 'buzz', done)
    })

    it('should return undefined without cookie', function (done) {
      request(createServer(function (req, res, cookies) {
        res.end(String(cookies.get('fizz')))
      }))
      .get('/')
      .set('Cookie', 'foo=bar')
      .expect(200, 'undefined', done)
    })

    it('should return undefined without header', function (done) {
      request(createServer(function (req, res, cookies) {
        res.end(String(cookies.get('foo')))
      }))
      .get('/')
      .expect(200, 'undefined', done)
    })
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

    it('should work for cookie name with special characters', function (done) {
      request(createServer(function (req, res, cookies) {
        cookies.set('foo*(#bar)?.|$', 'buzz')
        res.end()
      }))
      .get('/')
      .expect(200)
      .expect(shouldSetCookieToValue('foo*(#bar)?.|$', 'buzz'))
      .end(done)
    })

    describe('"httpOnly" option', function () {
      it('should be set by default', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar')
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieWithAttribute('foo', 'httpOnly'))
        .end(done)
      })

      it('should set to true', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar', { httpOnly: true })
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieWithAttribute('foo', 'httpOnly'))
        .end(done)
      })

      it('should set to false', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar', { httpOnly: false })
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieWithoutAttribute('foo', 'httpOnly'))
        .end(done)
      })
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

    describe('"overwrite" option', function () {
      it('should be off by default', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar')
          cookies.set('foo', 'baz')
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieCount(2))
        .expect(shouldSetCookieToValue('foo', 'bar'))
        .end(done)
      })

      it('should overwrite same cookie by name when true', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar')
          cookies.set('foo', 'baz', { overwrite: true })
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieCount(1))
        .expect(shouldSetCookieToValue('foo', 'baz'))
        .end(done)
      })

      it('should overwrite based on name only', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar', { path: '/foo' })
          cookies.set('foo', 'baz', { path: '/bar', overwrite: true })
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieCount(1))
        .expect(shouldSetCookieToValue('foo', 'baz'))
        .expect(shouldSetCookieWithAttributeAndValue('foo', 'path', '/bar'))
        .end(done)
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

function shouldSetCookieCount (num) {
  return function (res) {
    var setCookie = res.headers['set-cookie']
    var count = setCookie ? setCookie.length : 0
    assert.equal(count, num, 'should set cookie ' + num + ' times')
  }
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

function shouldSetCookieWithAttribute (name, attrib) {
  return function (res) {
    var header = cookie(res)
    var data = header && parseSetCookie(header)
    assert.ok(header, 'should have a cookie header')
    assert.equal(data.name, name, 'should set cookie ' + name)
    assert.ok((attrib.toLowerCase() in data), 'should set cookie with attribute ' + attrib)
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
