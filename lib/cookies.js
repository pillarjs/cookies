var cache = {}

function Cookies( request, response, keys ) {
  this.request = request
  this.response = response
  this.keys = keys
}

Cookies.prototype = {
  get: function( name, opts ) {
    var sigName = name + ".sig"
      , header, match, value, remote, data, index
      
    header = this.request.headers[ "cookie" ]
    if ( !header ) return    

    match = header.match( getPattern( name ) )
    if ( !match ) return
    
    value = match[ 1 ]
    if ( !opts || !opts.signed ) return value

    remote = this.get( sigName )
    if ( !remote ) return
    
    data = name + "=" + value    
    index = this.keys.index( data, remote )

    if ( index < 0 ) this.set( sigName, null, { path: "/" } )
    
    else {
      index && this.set( sigName, this.keys.sign( data ) )
      return value
    }
  },
  
  set: function( name, value, opts ) {
    var res = this.response
      , req = this.request
      , headers = res.getHeader( "Set-Cookie" ) || []
      , secure = res.socket ? res.socket.encrypted || req.connection.proxySecure : req.connection.proxySecure
      , cookie = new Cookie( name, value, opts )
      , header
      
    if ( typeof headers == "string" ) headers = [ headers ]
      
    if ( !secure && opts && opts.secure ) throw "Cannot send secure cookie over unencrypted socket"
    
    cookie.secure = secure
    if (opts && "secure" in opts) cookie.secure = opts.secure
    headers.push( cookie.toHeader() )
    
    if ( opts && opts.signed ) {
      cookie.value = this.keys.sign( cookie.toString() )
      cookie.name += ".sig"
      headers.push( cookie.toHeader() )
    }

    res.setHeader( "Set-Cookie", headers )
    return this
  }
}

function Cookie( name, value, attrs ) {
  value || ( this.expires = new Date( 0 ) )

  this.name = name
  this.value = value || ""

  for ( var name in attrs ) this[ name ] = attrs[ name ]
}

Cookie.prototype = {
  path: "/",
  expires: undefined,
  domain: undefined,
  httpOnly: true,
  secure: false,

  toString: function() { return this.name + "=" + this.value },
  
  toHeader: function() {
    var header = this.toString()
    
    if ( this.path      ) header += "; path=" + this.path
    if ( this.expires   ) header += "; expires=" + this.expires.toUTCString()
    if ( this.domain    ) header += "; domain=" + this.domain
    if ( this.secure    ) header += "; secure"
    if ( this.httpOnly  ) header += "; httponly"
    
    return header
  }
}

function getPattern( name ) {
  if ( cache[ name ] ) return cache[ name ]
  
  return cache[ name ] = new RegExp(
    "(?:^|;) *" +
    name.replace( /[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&" ) +
    "=([^;]*)"
  )
}

Cookies.connect = Cookies.express = function(keys) {
  return function(req, res, next) {
    req.cookies = res.cookies = new Cookies(req, res, keys)
    next()
  }
}

module.exports = Cookies