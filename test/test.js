
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

    describe('"signed" option', function () {
      describe('when true', function () {
        it('should throw without .keys', function (done) {
          request(createServer(function (req, res, cookies) {
            res.end(String(cookies.get('foo', { signed: true })))
          }))
          .get('/')
          .set('Cookie', 'foo=bar; foo.sig=iW2fuCIzk9Cg_rqLT1CAqrtdWs8')
          .expect(500)
          .expect('Error: .keys required for signed cookies')
          .end(done)
        })

        it('should return signed cookie value', function (done) {
          var opts = { keys: ['keyboard cat'] }
          request(createServer(opts, function (req, res, cookies) {
            res.end(String(cookies.get('foo', { signed: true })))
          }))
          .get('/')
          .set('Cookie', 'foo=bar; foo.sig=iW2fuCIzk9Cg_rqLT1CAqrtdWs8')
          .expect(200, 'bar', done)
        })

        describe('when signature is invalid', function () {
          it('should return undefined', function (done) {
            var opts = { keys: ['keyboard cat'] }
            request(createServer(opts, function (req, res, cookies) {
              res.end(String(cookies.get('foo', { signed: true })))
            }))
            .get('/')
            .set('Cookie', 'foo=bar; foo.sig=v5f380JakwVgx2H9B9nA6kJaZNg')
            .expect(200, 'undefined', done)
          })

          it('should delete signature cookie', function (done) {
            var opts = { keys: ['keyboard cat'] }
            request(createServer(opts, function (req, res, cookies) {
              res.end(String(cookies.get('foo', { signed: true })))
            }))
            .get('/')
            .set('Cookie', 'foo=bar; foo.sig=v5f380JakwVgx2H9B9nA6kJaZNg')
            .expect(200)
            .expect('undefined')
            .expect(shouldSetCookieCount(1))
            .expect(shouldSetCookieWithAttributeAndValue('foo.sig', 'expires', 'Thu, 01 Jan 1970 00:00:00 GMT'))
            .end(done)
          })
        })

        describe('when signature matches old key', function () {
          it('should return signed value', function (done) {
            var opts = { keys: ['keyboard cat a', 'keyboard cat b'] }
            request(createServer(opts, function (req, res, cookies) {
              res.end(String(cookies.get('foo', { signed: true })))
            }))
            .get('/')
            .set('Cookie', 'foo=bar; foo.sig=NzdRHeORj7MtAMhSsILYRsyVNI8')
            .expect(200, 'bar', done)
          })

          it('should set signature with new key', function (done) {
            var opts = { keys: ['keyboard cat a', 'keyboard cat b'] }
            request(createServer(opts, function (req, res, cookies) {
              res.end(String(cookies.get('foo', { signed: true })))
            }))
            .get('/')
            .set('Cookie', 'foo=bar; foo.sig=NzdRHeORj7MtAMhSsILYRsyVNI8')
            .expect(200)
            .expect('bar')
            .expect(shouldSetCookieCount(1))
            .expect(shouldSetCookieToValue('foo.sig', 'tecF04p5ua6TnfYxUTDskgWSKJE'))
            .end(done)
          })
        })
      })
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

      it('should set to ""', function (done) {
        request(createServer(function (req, res, cookies) {
          cookies.set('foo', 'bar', { path: '' })
          res.end()
        }))
        .get('/')
        .expect(200)
        .expect(shouldSetCookieWithoutAttribute('foo', 'path'))
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

    describe('"signed" option', function () {
      describe('when true', function () {
        it('should throw without .keys', function (done) {
          request(createServer(function (req, res, cookies) {
            cookies.set('foo', 'bar', { signed: true })
            res.end()
          }))
          .get('/')
          .expect(500)
          .expect('Error: .keys required for signed cookies')
          .end(done)
        })

        it('should set additional .sig cookie', function (done) {
          var opts = { keys: ['keyboard cat'] }
          request(createServer(opts, function (req, res, cookies) {
            cookies.set('foo', 'bar', { signed: true })
            res.end()
          }))
          .get('/')
          .expect(200)
          .expect(shouldSetCookieCount(2))
          .expect(shouldSetCookieToValue('foo', 'bar'))
          .expect(shouldSetCookieToValue('foo.sig', 'iW2fuCIzk9Cg_rqLT1CAqrtdWs8'))
          .end(done)
        })

        it('should use first key for signature', function (done) {
          var opts = { keys: ['keyboard cat a', 'keyboard cat b'] }
          request(createServer(opts, function (req, res, cookies) {
            cookies.set('foo', 'bar', { signed: true })
            res.end()
          }))
          .get('/')
          .expect(200)
          .expect(shouldSetCookieCount(2))
          .expect(shouldSetCookieToValue('foo', 'bar'))
          .expect(shouldSetCookieToValue('foo.sig', 'tecF04p5ua6TnfYxUTDskgWSKJE'))
          .end(done)
        })

        describe('with "path"', function () {
          it('should set additional .sig cookie with path', function (done) {
            var opts = { keys: ['keyboard cat'] }
            request(createServer(opts, function (req, res, cookies) {
              cookies.set('foo', 'bar', { signed: true, path: '/admin' })
              res.end()
            }))
            .get('/')
            .expect(200)
            .expect(shouldSetCookieCount(2))
            .expect(shouldSetCookieWithAttributeAndValue('foo', 'path', '/admin'))
            .expect(shouldSetCookieWithAttributeAndValue('foo.sig', 'path', '/admin'))
            .end(done)
          })
        })

        describe('with "overwrite"', function () {
          it('should set additional .sig cookie with httpOnly', function (done) {
            var opts = { keys: ['keyboard cat'] }
            request(createServer(opts, function (req, res, cookies) {
              cookies.set('foo', 'bar', { signed: true })
              cookies.set('foo', 'baz', { signed: true, overwrite: true })
              res.end()
            }))
            .get('/')
            .expect(200)
            .expect(shouldSetCookieCount(2))
            .expect(shouldSetCookieToValue('foo', 'baz'))
            .expect(shouldSetCookieToValue('foo.sig', 'ptOkbbiPiGfLWRzz1yXP3XqaW4E'))
            .end(done)
          })
        })
      })
    })
  })
})

describe('Cookies(req, res, [options])', function () {
  it('should create new cookies instance', function (done) {
    var server = http.createServer(function (req, res) {
      try {
        var cookies = Cookies(req, res, { keys: ['a', 'b'] })
        assert.ok(cookies)
        assert.strictEqual(cookies.constructor, Cookies)
        assert.strictEqual(cookies.request, req)
        assert.strictEqual(cookies.response, res)
        assert.strictEqual(typeof cookies.keys, 'object')
        res.end('OK')
      } catch (e) {
        res.statusCode = 500
        res.end(e.name + ': ' + e.message)
      }
    })

    request(server)
    .get('/')
    .expect('OK')
    .expect(200)
    .end(done)
  })
})

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

function getCookieForName (res, name) {
  var cookies = getCookies(res)

  for (var i = 0; i < cookies.length; i++) {
    if (cookies[i].name === name) {
      return cookies[i]
    }
  }
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

function shouldSetCookieCount (num) {
  return function (res) {
    var count = getCookies(res).length
    assert.equal(count, num, 'should set cookie ' + num + ' times')
  }
}

function shouldSetCookieToValue (name, val) {
  return function (res) {
    var cookie = getCookieForName(res, name)
    assert.ok(cookie, 'should set cookie ' + name)
    assert.equal(cookie.value, val, 'should set cookie ' + name + ' to ' + val)
  }
}

function shouldSetCookieWithAttribute (name, attrib) {
  return function (res) {
    var cookie = getCookieForName(res, name)
    assert.ok(cookie, 'should set cookie ' + name)
    assert.ok((attrib.toLowerCase() in cookie), 'should set cookie with attribute ' + attrib)
  }
}

function shouldSetCookieWithAttributeAndValue (name, attrib, value) {
  return function (res) {
    var cookie = getCookieForName(res, name)
    assert.ok(cookie, 'should set cookie ' + name)
    assert.ok((attrib.toLowerCase() in cookie), 'should set cookie with attribute ' + attrib)
    assert.equal(cookie[attrib.toLowerCase()], value, 'should set cookie with attribute ' + attrib + ' set to ' + value)
  }
}

function shouldSetCookieWithoutAttribute (name, attrib) {
  return function (res) {
    var cookie = getCookieForName(res, name)
    assert.ok(cookie, 'should set cookie ' + name)
    assert.ok(!(attrib.toLowerCase() in cookie), 'should set cookie without attribute ' + attrib)
  }
}
