var express = require('express');
var http2Req;
var http2Res;
if(process.env.HTTP2_TEST){
  var http2 = require('http2');
  var reqDecorator = require('./requestDecorator');
  var resDecorator = require('./responseDecorator');
  http2Req = reqDecorator(Object.create(http2.Http2ServerRequest.prototype));
  http2Res = resDecorator(Object.create(http2.Http2ServerResponse.prototype));
}

function createApp(){
  var app = express();
  if(process.env.HTTP2_TEST){
    app.request = Object.create(http2Req, {
      app: { configurable: true, enumerable: true, writable: true, value: app }
    });
    app.response = Object.create(http2Res, {
      app: { configurable: true, enumerable: true, writable: true, value: app }
    });
  }
  return app;
}

module.exports = createApp;
