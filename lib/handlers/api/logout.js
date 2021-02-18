/*
* Logout Handler
*/
import _data from '../../data.js';
import { deleteCookieHeader } from '../../helpers.js';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('logout');

export default {
  
  // ._callSub in handlers/index.js calls the same method
  // In this case, we're using the delete
  async get(request) {
    return this.delete(request);
  },

  // Required data: none
  // Optional data: none
  async delete(request) {
    debug(formatWithOptions({colors: true}, '[LOGOUT] Request: %O', request));

    return {status: 204, payload: {}, contentType: 'application/json', headers: deleteCookieHeader()};
  }
}