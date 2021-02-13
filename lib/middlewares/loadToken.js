/*
* This middleware only loads the token without necessarily denying access if the user has no authentication.
*/
import _data from '../data.js';
import { validate } from '../helpers.js';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('middlewares/load-token');

export default async (request, next) => {
  debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] Request: %O', request));

  // Uses Bearer authentication scheme
  if(request.headers.authorization){
    const tmpId = request.headers.authorization.split(' ')[1];

    // Verify if token length is valid
    // tokens.js
    const tokenIdLength =  20;
    const tokenId = validate(tmpId, 'token', {equal: tokenIdLength});
    debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] Token ID: %O', tokenId));

    if(tokenId){
      try{
        // Verify if token exists
        const tokenData = await _data.read('tokens', tokenId);
        debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] Token Data: %O', tokenData));
        
        // Verify that the token has not expired
        if(tokenData.expires > Date.now()){
          // Save in request.token
          request.token = tokenData;
          debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] New Request: %O', request));
          next();
        }else{
          next();
        }
      }catch{
        next();
      }
    }else{
      next();
    }
  }else{
    next();
  }
};