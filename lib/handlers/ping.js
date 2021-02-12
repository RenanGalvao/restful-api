/*
* Ping Handler 
*/
import { debuglog, formatWithOptions } from 'util'; 

// Setting debug name for the file
const debug = debuglog('ping');

export default {
  async get(request) {
    debug(formatWithOptions({colors: true}, '[PING][GET] Request: %O', request));

    return {status: 200, payload: {message: 'pong'}};
  }
}