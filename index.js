const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const path = require('path');

const config = require(path.join(__dirname, 'config'));
const handlers = require(path.join(__dirname, 'lib', 'handlers'));
const helpers = require(path.join(__dirname, 'lib', 'helpers')); 


// Instantiate the HTTP server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, () => {
  console.log(`The server is listening on port ${config.httpPort}.`);
});


// Instantiate the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, 'https', 'key.pen')),
  cert: fs.readFileSync(path.join(__dirname, 'https', 'cert.pen')),
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort, () => {
  console.log(`The server is listening on port ${config.httpsPort}.`);
});


// All the server logic for both  the http and https server
const unifiedServer = (req, res) => {
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
    const chooseHandler =  typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

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

      console.log('Returning this response: ', status, payloadString);
    });
  });
};


const router = {
  hello: handlers.hello,
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
};