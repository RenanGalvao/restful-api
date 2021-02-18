/*
* Checks GUI Handler 
*/
import { getTemplate } from '../../helpers.js';
import { debuglog, formatWithOptions } from 'util'; 

// Setting debug name for the file
const debug = debuglog('checks-gui');

export default {
  async all(request) {
    debug(formatWithOptions({colors: true}, '[CHECKS][ALL] Request: %O', request));

    try{
      const data = {
        'head.title': 'Dashboard',
        'head.description': '',
        'body.class': 'checksList',
      };

      const payload = await getTemplate('checks', 'all', data);
      debug(formatWithOptions({colors: true}, '[CHECKS][ALL] Response: %O', payload));
      return {status: 200, payload, contentType: 'text/html'};
    }catch(err){
      return errorHandler(err);
    }
  },

  async create(request) {
    debug(formatWithOptions({colors: true}, '[CHECKS][CREATE] Request: %O', request));

    try{
      const data = {
        'head.title': 'Create a New Check',
        'head.description': '',
        'body.class': 'checksCreate',
      };

      const payload = await getTemplate('checks', 'create', data);
      debug(formatWithOptions({colors: true}, '[CHECKS][CREATE] Response: %O', payload));
      return {status: 200, payload, contentType: 'text/html'};
    }catch(err){
      return errorHandler(err);
    }
  },

  async edit(request){

  },
};