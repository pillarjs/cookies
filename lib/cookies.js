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

    if ( index < 0 ) this.set( sigName, null )
    
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
      // TODO: check for existing header
      isArray( header ) ? header.push( str ) : header = [ header, str ]
    }
    
    this.response.setHeader( "Set-Cookie", header )
    
    if ( !value || !opts || !opts.signed ) return this
    
    return this.set( name + ".sig", this.keys.sign( cookie ) )
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

// var isArray = Array.isArray
// 
// function Cookies( req, res ) {
//   var header = req.headers.cookie, self = this
// 
//   if ( !( this instanceof Cookies ) ) return new Cookies( req, res )
//   
//   header && header.replace( /([^; ]+)=([^; ]+)/g, function( src, name, value ) {
//     var cookie = self[ name ] = new Cookie( name, value )
//     
//     cookie.cookies = self
//     cookie.request = req
//     cookie.response = res
//   })
// }
// 
// Cookies.prototype
// 
// function Cookie( name, value, attrs ) {
//   this.name = name
//   this.value = 1 in arguments ? value : ""
//   
//   for ( name in attrs ) this[ name ] = attrs[ name ]
// }
// 
// Cookie.prototype = {
//   from: function( source ) {
//     return ( new Cookies( request ) )[ this.name ]  
//   },
//   
//   isSigned: function( keys ) {
//     var sig = this.cookies[ this.name + ".sig" ]
//       , data = this.name + "=" + this.value
//       , index = keys.verify( data, sig.value )
//       
//     return index  
//   },
//   
//   sign: function( keys ) {
//     ( new Cookie(
//       this.name + ".sig",
//       keys.sign( this.name + "=" + this.value ),
//       { response: this.response }
//     ) ).write()
//     
//     return this  
//   },
//   
//   unsign: function() {
//     var sig = this.cookies[ this.name + ".sig" ]
//     sig && sig.destroy()
//     
//     return this
//   },
// 
//   destroy: function() {
//     this.value = ""
//     this.expires = new Date( 0 )
//     
//     return this.write()
//   },
// 
//   toString: function(){ return this.value },
//   
//   toHeader: function() {
//     var header = this.name + "=" + this.value
//     
//     if ( this.expires  ) header += "; expires=" + this.expires.toUTCString()
//     if ( this.path     ) header += "; path=" + this.path
//     if ( this.domain   ) header += "; domain=" + this.domain
//     if ( this.secure   ) header += "; secure"
//     if ( this.httpOnly ) header += "; httponly"
//     
//     return header
//   },
//   
//   write: function( response ) {
//     response || ( response = this.response )
//     
//     if ( !response ) throw "No response defined to write to."
//     
//     var headers = response.getHeader( "Set-Cookie" )
//       , header = this.toHeader()
// 
//     !headers           ? headers = header :
//     isArray( headers ) ? headers.push( header ) :
//                          headers = [ headers, header ]
//     
//     response.setHeader( "Set-Cookie", headers )
//     
//     return this
//   }
// }
// 
// Cookies.Cookie = Cookie
// module.exports = Cookies