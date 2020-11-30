const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const path = require('path');

const config = require('../config');
const handlers = require('./handlers');
const helpers = require('./helpers');
const util = require('util');
const debug = util.debuglog('server');


// Server module object
let server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '..', 'https', 'key.pen')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'cert.pen')),
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res);
});


// All the server logic for both  the http and https server
server.unifiedServer = (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  const queryStringObject = parsedUrl.query;

  const method = req.method.toLowerCase();

  const headers = req.headers;

  // payload
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', (data) => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    // handlers
    const chooseHandler =  typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // route the request
    chooseHandler(data, (status, payload) => {
      // default status
      status = typeof(status) == 'number' ? status : 200;

      // default payload
      payload = typeof(payload) == 'object' ? payload : {};

      // convert the payload to string
      const payloadString = JSON.stringify(payload);

      // send response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(status);
      res.end(payloadString);

      // if the response is 200, print green otherwise print red
      if(status == 200){
        debug('\x1b[32m%s\x1b[0m',`[${method.toUpperCase()}] /${trimmedPath} ${status}`);
      }else{
        debug('\x1b[31m%s\x1b[0m',`[${method.toUpperCase()}] /${trimmedPath} ${status}`);
      }
     
    });
  });
};

server.router = {
  hello: handlers.hello,
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[33m%s\x1b[0m', `The server is listening on port ${config.httpPort}.`);
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[33m%s\x1b[0m', `The server is listening on port ${config.httpsPort}.`);
  });

};

module.exports = server;