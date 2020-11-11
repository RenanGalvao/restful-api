const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  console.log(trimmedPath);

  const queryStringObject = parsedUrl.query;

  const method = req.method.toUpperCase();

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
      payload: buffer
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
});

server.listen(3000, () => {
  console.log('The server is listening on port 3000 now');
});


const handlers = {

  sample: (data, callback) => {

    callback(406, {name: 'sample handler'});
  },

  notFound: (data, callback) => {

    callback(404);
  }
}

const router = {
  sample: handlers.sample
}