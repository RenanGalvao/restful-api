import server from './lib/server.js';
import workers from './lib/workers.js';

let app = {};

app.init = () => {
  // Start the server
  server.init();

  // Start the workers
  workers.init();
};

// Execute
app.init();

export default app;