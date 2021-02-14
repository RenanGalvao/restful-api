/*
* Logout Handler
*/
import _data from '../../data.js';
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

    try{
      // Deletes based on toke.id
      // Do not tell the user if we deleted something or not. Always give the same answer.
      await _data.delete('tokens', request.token.id);
    }catch(err){
      debug(formatWithOptions({colors: true}, '[LOGOUT] Error: %O', err));
    }
    return {status: 204, payload: {}};
  }
}