/*
* Session Handler 
*/
import { getTemplate } from '../../helpers.js';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('session');

export default {
  async create(request) {
    debug(formatWithOptions({colors: true}, '[SESSION][CREATE] Request: %O', request));

    try{
      const data = {
        'head.title': 'Login to Your Account',
        'head.description': 'Please enter your phone number and password to access your account.',
        'body.class': 'sessionCreate',
      };

      const payload = await getTemplate('session', 'create', data);
      debug(formatWithOptions({colors: true}, '[SESSION][CREATE] Response: %O', payload));
      return {status: 200, payload, contentType: 'text/html'};
    }catch(err){
      return errorHandler(err);
    }
  },

  async deleted(request){

  },
};