var assert = require( "assert" )
  , http = require( "http" )
  , keys = require( "keygrip" )()
  , Cookies = require( "cookies" )
  , options = { host: "localhost", port: 8000, path: "/set" }
  , server

server = http.createServer( function( req, res ) {
  var cookies = new Cookies( req, res, keys )
    , insecure, secure, tampered
  
  if ( req.url == "/set" ) {
    cookies
      // set a regular cookie
      .set( "insecure", "foo" )

      // set a signed cookie
      .set( "secure", "bar", { signed: true } )

      // mimic a signed cookie, but with a bogus signature
      .set( "tampered", "baz" )
      .set( "tampered.sig", "bogus" )

    res.writeHead( 302, { "Location": "/" } )
    return res.end( "Now let's check." )
  }
  
  insecure = cookies.get( "insecure" )
  secure = cookies.get( "secure", { signed: true } )
  tampered = cookies.get( "tampered", { signed: true } )
  
  assert.equal( insecure, "foo" )
  assert.equal( secure, "bar" )
  assert.notEqual( tampered, "baz" )
  assert.equal( tampered, undefined )

  res.writeHead( 200, { "Content-Type": "text/plain" } )
  res.end(
    "insecure expected: foo\n\n" +
    "insecure actual: " + insecure + "\n\n" +
    "secure expected: bar\n\n" +
    "secure actual: " + secure + "\n\n" +
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