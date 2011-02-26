var cache = {}
  , isArray = Array.isArray

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
    var header = this.response.getHeader( "Set-Cookie" )
      , cookie, str = name + "="
    
    value
      ? cookie = str += value
      : opts = { expires: new Date( 0 ) }
    
    if ( opts ) {
      if ( opts.expires  ) str += "; expires=" + opts.expires.toUTCString()
      if ( opts.path     ) str += "; path=" + opts.path
      if ( opts.domain   ) str += "; domain=" + opts.domain
      if ( opts.secure   ) str += "; secure"
      if ( opts.httpOnly ) str += "; httponly"
    }
    
    if ( !header ) header = str
    
    else {
      // TODO: check for existing header with same name
      isArray( header ) ? header.push( str ) : header = [ header, str ]
    }
    
    this.response.setHeader( "Set-Cookie", header )
    
    if ( !value || !opts || !opts.signed ) return this
    
    opts = Object.create( opts )
    opts.signed = false
    
    return this.set( name + ".sig", value && this.keys.sign( cookie ), opts )
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

module.exports = Cookies