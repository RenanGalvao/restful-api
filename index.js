const server = require('./lib/server');
const workers = require('./lib/workers');

let app = {};

app.init = () => {
  // Start the server
  server.init();

  // Start the workers
  workers.init();
};

// Execute
app.init();

// Export for testing
module.exports = app;