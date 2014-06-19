
var cache = {}
exports.getPattern = function getPattern(name) {
  if (cache[name]) return cache[name]

  return cache[name] = new RegExp(
    "(?:^|;) *" +
    name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") +
    "=([^;]*)"
  )
}

exports.pushCookie = function pushCookie(cookies, cookie) {
  if (cookie.overwrite) {
    cookies = cookies.filter(function(c) { 
      return c.indexOf(cookie.name+'=') !== 0
    })
  }
  cookies.push(cookie.toHeader())
  return cookies
}

exports.merge = function merge(dest, src) {
  for (var name in src) dest[name] = src[name]
  return dest
}
