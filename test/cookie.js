
var assert = require('assert')
var cookies = require('..')

describe('new Cookie(name, value, [options])', function () {
  it('should have correct constructor', function () {
    var cookie = new cookies.Cookie('foo', 'bar')
    assert.equal(cookie.constructor, cookies.Cookie)
  })

  it('should throw on invalid name', function () {
    assert.throws(function () {
      new cookies.Cookie('foo\n', 'bar')
    }, /argument name is invalid/)
  })

  it('should throw on invalid value', function () {
    assert.throws(function () {
      new cookies.Cookie('foo', 'bar\n')
    }, /argument value is invalid/)
  })

  it('should throw on invalid path', function () {
    assert.throws(function () {
      new cookies.Cookie('foo', 'bar', { path: '/\n' })
    }, /option path is invalid/)
  })

  it('should throw on invalid domain', function () {
    assert.throws(function () {
      new cookies.Cookie('foo', 'bar', { domain: 'example.com\n' })
    }, /option domain is invalid/)
  })

  describe('options', function () {
    describe('maxage', function () {
      it('should set the .maxAge property', function () {
        var cookie = new cookies.Cookie('foo', 'bar', { maxage: 86400 })
        assert.equal(cookie.maxAge, 86400)
      })

      it('should set the .maxage property', function () {
        var cookie = new cookies.Cookie('foo', 'bar', { maxage: 86400 })
        assert.equal(cookie.maxage, 86400)
      })
    })

    describe('maxAge', function () {
      it('should set the .maxAge property', function () {
        var cookie = new cookies.Cookie('foo', 'bar', { maxAge: 86400 })
        assert.equal(cookie.maxAge, 86400)
      })

      it('should set the .maxage property', function () {
        var cookie = new cookies.Cookie('foo', 'bar', { maxAge: 86400 })
        assert.equal(cookie.maxage, 86400)
      })
    })
  })
})
