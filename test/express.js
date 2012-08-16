#!/usr/bin/env node

var assert = require( "assert" )
  , express = require( "express" )
  , http = require( "http" )
  , keys = require( "keygrip" )()
  , cookies = require( "../" ).express
  , options = { host: "localhost", port: 8000, path: "/set" }
  , app = express.createServer()

app.use( cookies( keys ) )

app.get( "/set", function(req, res) {
  res.cookies
    // set a regular cookie
    .set( "unsigned", "foo", { httpOnly: false } )

    // set a signed cookie
    .set( "signed", "bar", { signed: true } )

    // mimic a signed cookie, but with a bogus signature
    .set( "tampered", "baz" )
    .set( "tampered.sig", "bogus" )

  res.writeHead(302, {Location: "/"})
  res.end()
})

app.get("/", function(req, res) {
  var unsigned = req.cookies.get( "unsigned" )
    , signed = req.cookies.get( "signed", { signed: true } )
    , tampered = req.cookies.get( "tampered", { signed: true } )
  
  assert.equal( unsigned, "foo" )
  assert.equal( signed, "bar" )
  assert.notEqual( tampered, "baz" )
  assert.equal( tampered, undefined )

  res.send(
    "unsigned expected: foo\n" +
    "unsigned actual: " + unsigned + "\n\n" +
    "signed expected: bar\n" +
    "signed actual: " + signed + "\n\n" +
    "tampered expected: undefined\n"+
    "tampered: " + tampered + "\n"
  )
})

var server = require('http').createServer(app);

server.listen( 8000 )

http.get( options, function( res ) {
  var header = res.headers[ "set-cookie" ]
    , body = ""
  
  console.log( "\ncookies set:", header )
  console.log( "\n============\n" )

  options.path = res.headers[ "Location" ]
  options.headers = { "Cookie": header.join(";") }

  http.get( options, function( res ) {
    res.on( "data", function( chunk ){ body += chunk } )
    res.on( "end", function(){ console.log( body ) })
    server.close()
  })
})
