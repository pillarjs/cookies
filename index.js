/*!
 * cookies
 * Copyright(c) 2014 Jed Schmidt, http://jed.is/
 * Copyright(c) 2015-2016 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

var deprecate = require('depd')('cookies')
var Keygrip = require('keygrip')
var http = require('http')
var cache = {}

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

/**
 * RegExp to match Same-Site cookie attribute value.
 */

var SAME_SITE_REGEXP = /^(?:lax|none|strict)$/i

function Cookies(request, response, options) {
  if (!(this instanceof Cookies)) return new Cookies(request, response, options)

  this.secure = undefined
  this.request = request
  this.response = response

  if (options) {
    if (Array.isArray(options)) {
      // array of key strings
      deprecate('"keys" argument; provide using options {"keys": [...]}')
      this.keys = new Keygrip(options)
    } else if (options.constructor && options.constructor.name === 'Keygrip') {
      // any keygrip constructor to allow different versions
      deprecate('"keys" argument; provide using options {"keys": keygrip}')
      this.keys = options
    } else {
      this.keys = Array.isArray(options.keys) ? new Keygrip(options.keys) : options.keys
      this.secure = options.secure
    }
  }
}

Cookies.prototype.get = function(name, opts) {
  var all = this.getAll(name, opts)
  if (all.length < 1) return
  return all[0]
}

Cookies.prototype.getAll = function(name, opts) {
  var sigName = name + ".sig"
    , header, remotes, matches, pattern, match, value, index, data
    , signed = opts && opts.signed !== undefined ? opts.signed : !!this.keys
    , values = []

  header = this.request.headers["cookie"]
  if (!header) return []

  if (opts && signed) {
    if (!this.keys) throw new Error('.keys required for signed cookies');
    remotes = this.getAll(sigName)
    if (remotes.length === 0) return [];
  }

  matches = header.match(getPattern(name, { global: true }));
  if(!matches) return []

  pattern = getPattern(name)
  for (var i = 0; i < matches.length; i++) {
    match = matches[i].match(pattern)
    value = match[1]

    if (!opts || !signed) {
      values.push(value)
      continue
    }

    index = -1
    data = name + "=" + value
    for (var j = 0; index < 0 && j < remotes.length; j++) {
      index = this.keys.index(data, remotes[j])
    }

    if (index < 0) {
      this.set(sigName, null, {path: "/", signed: false })
    } else {
      index && this.set(sigName, this.keys.sign(data), { signed: false })
      values.push(match[1])
    }
  }

  return values
}

Cookies.prototype.set = function(name, value, opts) {
  var res = this.response
    , req = this.request
    , headers = res.getHeader("Set-Cookie") || []
    , secure = this.secure !== undefined ? !!this.secure : req.protocol === 'https' || req.connection.encrypted
    , cookie = new Cookie(name, value, opts)
    , signed = opts && opts.signed !== undefined ? opts.signed : !!this.keys

  if (typeof headers == "string") headers = [headers]

  if (!secure && opts && opts.secure) {
    throw new Error('Cannot send secure cookie over unencrypted connection')
  }

  cookie.secure = opts && opts.secure !== undefined
    ? opts.secure
    : secure

  if (opts && "secureProxy" in opts) {
    deprecate('"secureProxy" option; use "secure" option, provide "secure" to constructor if needed')
    cookie.secure = opts.secureProxy
  }

  pushCookie(headers, cookie)

  if (opts && signed) {
    if (!this.keys) throw new Error('.keys required for signed cookies');
    cookie.value = this.keys.sign(cookie.toString())
    cookie.name += ".sig"
    pushCookie(headers, cookie)
  }

  var setHeader = res.set ? http.OutgoingMessage.prototype.setHeader : res.setHeader
  setHeader.call(res, 'Set-Cookie', headers)
  return this
};

function Cookie(name, value, attrs) {
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }

  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError('argument value is invalid');
  }

  this.name = name
  this.value = value || ""

  for (var name in attrs) {
    this[name] = attrs[name]
  }

  if (!this.value) {
    this.expires = new Date(0)
    this.maxAge = null
  }

  if (this.path && !fieldContentRegExp.test(this.path)) {
    throw new TypeError('option path is invalid');
  }

  if (this.domain && !fieldContentRegExp.test(this.domain)) {
    throw new TypeError('option domain is invalid');
  }

  if (this.sameSite && this.sameSite !== true && !SAME_SITE_REGEXP.test(this.sameSite)) {
    throw new TypeError('option sameSite is invalid')
  }
}

Cookie.prototype.path = "/";
Cookie.prototype.expires = undefined;
Cookie.prototype.domain = undefined;
Cookie.prototype.httpOnly = true;
Cookie.prototype.sameSite = false;
Cookie.prototype.secure = false;
Cookie.prototype.overwrite = false;

Cookie.prototype.toString = function() {
  return this.name + "=" + this.value
};

Cookie.prototype.toHeader = function() {
  var header = this.toString()

  if (this.maxAge) this.expires = new Date(Date.now() + this.maxAge);

  if (this.path     ) header += "; path=" + this.path
  if (this.expires  ) header += "; expires=" + this.expires.toUTCString()
  if (this.domain   ) header += "; domain=" + this.domain
  if (this.sameSite ) header += "; samesite=" + (this.sameSite === true ? 'strict' : this.sameSite.toLowerCase())
  if (this.secure   ) header += "; secure"
  if (this.httpOnly ) header += "; httponly"

  return header
};

// back-compat so maxage mirrors maxAge
Object.defineProperty(Cookie.prototype, 'maxage', {
  configurable: true,
  enumerable: true,
  get: function () { return this.maxAge },
  set: function (val) { return this.maxAge = val }
});
deprecate.property(Cookie.prototype, 'maxage', '"maxage"; use "maxAge" instead')

function getPattern(name, opts) {
  var flags = opts && opts.global === true ? 'g' : '';
  if (!cache[flags]) cache[flags] = {};
  if (cache[flags][name]) return cache[flags][name]

  return cache[flags][name] = new RegExp(
    "(?:^|;) *" +
    name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") +
    "=([^;]*)", flags
  )
}

function pushCookie(headers, cookie) {
  if (cookie.overwrite) {
    for (var i = headers.length - 1; i >= 0; i--) {
      if (headers[i].indexOf(cookie.name + '=') === 0) {
        headers.splice(i, 1)
      }
    }
  }

  headers.push(cookie.toHeader())
}

Cookies.connect = Cookies.express = function(keys) {
  return function(req, res, next) {
    req.cookies = res.cookies = new Cookies(req, res, {
      keys: keys
    })

    next()
  }
}

Cookies.Cookie = Cookie

module.exports = Cookies
