
var base64 = require('base64-url')
var Keygrip = require('keygrip')

var Cookie = require('./cookie')
var utils = require('./utils')

var getPattern = utils.getPattern
var pushCookie = utils.pushCookie
var merge = utils.merge

module.exports = function (options, keys) {
  if (Array.isArray(options)
    || (options && options.constructor && options.constructor.name === 'Keygrip')) {
    keys = options
    options = {}
  }

  options = options || {}
  keys = keys || options.keys
  if (Array.isArray(keys)) keys = new Keygrip(keys)

  function Cookies(req, res, next) {
    if (!(this instanceof Cookies)) return new Cookies(req, res, next)

    this.req = req
    this.res = res

    // middleware support
    if (typeof next === 'function') {
      req.cookies = res.cookies = this
      next()
    }
  }

  Cookies.prototype.get = function (name) {
    var header = this.req.headers.cookie
    if (!header) return
    var match = header.match(getPattern(name))
    if (!match) return
    return match[1]
  }

  Cookies.prototype.set = function (name, value, opts) {
    opts = this.extend(opts)

    var res = this.res
    var headers = res.getHeader('Set-Cookie') || []
    // node.js header sillyness
    if (typeof headers == "string") headers = [headers]

    var cookie = new Cookie(name, value, opts)
    headers = pushCookie(headers, cookie)

    res.setHeader('Set-Cookie', headers)
    return this
  }

  Cookies.prototype.decode = function (name, buffer) {
    var value = this.get(name)
    if (!value) return

    var buf = new Buffer(base64.unescape(value), 'base64')
    if (buffer) return buf
    return buf.toString('utf8')
  }

  Cookies.prototype.encode = function (name, value, opts) {
    opts = this.extend(opts)

    var digest = base64.escape(new Buffer(value, 'utf8').toString('base64'))
    this.set(name, digest, opts)
    return this
  }

  Cookies.prototype.unsign = function (name, opts) {
    opts = this.extend(opts)
    assertKeys()

    var value = opts.encoded
      ? this.decode(name + '.b64')
      : this.get(name)
    if (!value) return

    var remote = this.decode(name + '.sig', true)
    if (!remote) return // no signature

    var data = name + '=' + value
    var index = keys.index(data, remote)

    // invalid signature, so we clear it
    if (index < 0) return this.clear(name + '.sig', opts)

    // update the signature to the latest key
    // to do: update the original cookie as well
    if (index > 0) this.encode(name + '.sig', data, opts)
    return value
  }

  Cookies.prototype.sign = function (name, value, opts) {
    opts = this.extend(opts)
    assertKeys()

    if (opts.encoded) this.encode(name + '.b64', value, opts)
    else this.set(name, value, opts)
    this.encode(name + '.sig', keys.sign(name + '=' + value), opts)
    return this
  }

  Cookies.prototype.decrypt = function (name, opts) {
    opts = this.extend(opts)
    assertKeys()

    var value = this.decode(name + '.enc', true)
    if (!value) return

    var msg = keys.decrypt(value)
    if (!msg) return // bad decryption

    // re-encrypt if not using the latest key
    if (msg[1] > 0) this.encrypt(name, msg[0], opts)
    return msg[0].toString('utf8')
  }

  Cookies.prototype.encrypt = function (name, value, opts) {
    opts = this.extend(opts)
    assertKeys()

    this.encode(name + '.enc', keys.encrypt(value), opts)
    return this
  }

  // clear a cookie
  Cookies.prototype.clear = function (name, opts) {
    this.set(name, null, opts)
  }

  // inherit the options from the main options
  Cookies.prototype.extend = function (opts) {
    return merge(Object.create(options), opts || {})
  }

  return Cookies

  function assertKeys() {
    if (!keys) throw new Error('.keys required for signed cookies')
  }
}
