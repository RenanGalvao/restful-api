import http from 'http';
import https from 'https';
import { URL } from 'url';
import { StringDecoder } from 'string_decoder';
import fs from 'fs';
import path from 'path';
import config from '../config.js';
import handlers from '../lib/handlers/index.js'
import { parseJsonToObject } from './helpers.js';
import { debuglog, formatWithOptions } from 'util';

const debug = debuglog('server');


// Server module object
let server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(path.resolve('lib'), '..', 'https', 'key.pen')),
  cert: fs.readFileSync(path.join(path.resolve('lib'), '..', 'https', 'cert.pen')),
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res);
});


// Handle all requests for both http and https and creates a basic data object with useful info from req
server.unifiedServer = (req, res) => {

  // Request data
  const isHttps = typeof req.client._secureEstablished == 'boolean' ? true : false;
  const parsedUrl = new URL(req.url, `${isHttps ? 'https' : 'http'}://${config.domain}:${isHttps ? config.httpsPort : config.httpPort}`);
  let path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
  const slugs = path.split('/').slice(1);
  const queryStringObject = parsedUrl.searchParams;
  const method = req.method.toLowerCase();
  const headers = req.headers;

  // Retrieves payload
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', data => {
    buffer += decoder.write(data);
  });

  req.on('end', async () => {
    buffer += decoder.end();

    // Figure out the handler for the request
    // for those with 'api/' prefix, slug[0] gonna be used too
    path = slugs.length != 0 ? path.substring(0, path.indexOf('/')) : path;
    
    // Please, look at server.router
    const pathsThatNeedSlug = ['api', 'account', 'session', 'checks']; 
    const choosedHandler = (pathsThatNeedSlug.includes(path) && slugs.length > 0 && typeof server.router[path][slugs[0]] != 'undefined' ? server.router[path][slugs[0]] : !pathsThatNeedSlug.includes(path) && typeof server.router[path] != 'undefined' ? server.router[path] : handlers.notFound);

    // Joins all the requisition data into a single object to facilitate handling
    const data = {
      path,
      slugs,
      queryStringObject,
      method,
      headers,
      payload: parseJsonToObject(buffer),
    };
    debug(formatWithOptions({colors: true}, '[SERVER][UNIFIED_SERVER] Request: %O', data));

    // Handle the response
    try{
      const response = await choosedHandler(data);
      debug(formatWithOptions({colors: true}, '[SERVER][UNIFIED_SERVER] Response: %O', response));

      // Res accordingly to the Content-Type
      let payloadString = '';

      switch(response.contentType){
        case 'application/json': 
          payloadString = JSON.stringify(response.payload);
          break;
        default:
          payloadString = response.payload;
      }
      
      // Set optional headers if any
      if(response.headers){
        for(const header in response.headers){
          res.setHeader(header, response.headers[header]);
        }
      }
      
      // Send response
      res.writeHead(response.status, {
        'Content-Length': Buffer.byteLength(payloadString),
        'Content-Type': `${response.contentType}`,
      });
      res.end(payloadString);
      
    }catch{
      // Should not reach here, as fallback anyway
      const payloadString = JSON.stringify({err: 'Internal', message: 'Something went wrong.'});
      
      res.writeHead(500, {
        'Content-Length': Buffer.byteLength(payloadString),
        'Content-Type': 'application/json',
      });
      res.end(payloadString);
    }
  });
};

server.router = {
  '': handlers.index, // don't confuse method with the filename
  // Resolve inside the function
  account: {
    create: handlers.account,
    edit: handlers.account,
    deleted: handlers.account,
  },
  session: {
    create: handlers.session,
    deleted: handlers.session,
  },
  checks: {
    all: handlers.checksGui,
    create: handlers.checksGui,
    edit: handlers.checksGui,
  },
  api : {
    users: handlers.users,
    checks: handlers.checks,
    login: handlers.login,
    logout: handlers.logout,
  },
  public: handlers.public,
  'favicon.ico': handlers.favicon,
  ping: handlers.ping,
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

export default server;