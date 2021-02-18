/*
* Account Handler 
*/
import { getTemplate } from '../../helpers.js';
import { debuglog, formatWithOptions } from 'util'; 

// Setting debug name for the file
const debug = debuglog('account');


export default {
  async create(request) {
    debug(formatWithOptions({colors: true}, '[ACCOUNT][CREATE] Request: %O', request));

    try{
      const data = {
        'head.title': 'Create an Account',
        'head.description': 'SignUp is easy and only takes a few seconds.',
        'body.class': 'accountCreate',
      };

      const payload = await getTemplate('account', 'create', data);
      debug(formatWithOptions({colors: true}, '[ACCOUNT][CREATE] Response: %O', payload));
      return {status: 200, payload, contentType: 'text/html'};
    }catch(err){
      return errorHandler(err);
    }
  },

  async edit(request) {
    debug(formatWithOptions({colors: true}, '[ACCOUNT][EDIT] Request: %O', request));

    try{
      const data = {
        'head.title': 'Account Settings',
        'head.description': '',
        'body.class': 'accountEdit',
      };

      const payload = await getTemplate('account', 'edit', data);
      debug(formatWithOptions({colors: true}, '[ACCOUNT][EDIT] Response: %O', payload));
      return {status: 200, payload, contentType: 'text/html'};
    }catch(err){
      return errorHandler(err);
    }
  },

  async deleted(request){

  },
};