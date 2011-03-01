var assert = require( "assert" )
  , http = require( "http" )
  , keys = require( "keygrip" )()
  , Cookies = require( "cookies" )
  , options = { host: "localhost", port: 8000, path: "/set" }
  , server

server = http.createServer( function( req, res ) {
  var cookies = new Cookies( req, res, keys )
    , unsigned, signed, tampered
  
  if ( req.url == "/set" ) {
    cookies
      // set a regular cookie
      .set( "unsigned", "foo", { httpOnly: false } )

      // set a signed cookie
      .set( "signed", "bar", { signed: true } )

      // mimic a signed cookie, but with a bogus signature
      .set( "tampered", "baz" )
      .set( "tampered.sig", "bogus" )

    res.writeHead( 302, { "Location": "/" } )
    return res.end( "Now let's check." )
  }
  
  unsigned = cookies.get( "unsigned" )
  signed = cookies.get( "signed", { signed: true } )
  tampered = cookies.get( "tampered", { signed: true } )
  
  assert.equal( unsigned, "foo" )
  assert.equal( signed, "bar" )
  assert.notEqual( tampered, "baz" )
  assert.equal( tampered, undefined )

  res.writeHead( 200, { "Content-Type": "text/plain" } )
  res.end(
    "unsigned expected: foo\n\n" +
    "unsigned actual: " + unsigned + "\n\n" +
    "signed expected: bar\n\n" +
    "signed actual: " + signed + "\n\n" +
    "tampered expected: undefined\n\n"+
    "tampered: " + tampered + "\n\n"
  )
})

server.listen( 8000 )

http.get( options, function( res ) {
  var cookies = res.headers[ "set-cookie" ]
    , body = ""
  
  console.log( "cookies set:", cookies )
  console.log( "============" )

  options.path = res.headers[ "location" ]
  options.headers = { "Cookie": cookies.join(";") }

  http.get( options, function( res ) {
    res.on( "data", function( chunk ){ body += chunk } )
    res.on( "end", function(){ console.log( body ) })
    server.close()
  })
})