/*
* This is a middleware that checks if the user has sent the token and if it is valid. 
* Being valid, the request continues, being invalid, an error message is sent
* 
* Use this middleware on every route that requires authentication.
*/
import _data from '../data.js';
import loadToken from './loadToken.js';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('middlewares/verify-token');

export default async (request, next) => {
  debug(formatWithOptions({colors: true}, '[MIDDLEWARES][VERIFY_TOKEN] Request Before Load-Token: %O', request));

  // Load token before verifying
  await loadToken(request, () => {});
  debug(formatWithOptions({colors: true}, '[MIDDLEWARES][VERIFY_TOKEN] Request After Load-Token: %O', request));
  
  if(typeof request.token != 'undefined'){
    next(); return;
  }else{
    next(errorInvalid); return;
  }
};

const errorInvalid = {
  status: 401,
  payload: {
    err: 'Authorization',
    message: 'Token invalid or missing.',
  },
  contentType: 'application/json'
};

// For users.js
export { errorInvalid };