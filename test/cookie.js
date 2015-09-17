
var assert = require('assert')
var cookies = require('..')

describe('new Cookie', function () {
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
})
