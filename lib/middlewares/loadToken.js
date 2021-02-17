/*
* This middleware only loads the token without necessarily denying access if the user has no authentication.
*/
import _data from '../data.js';
import { validate, createTokens, generateCookieHeader } from '../helpers.js';
import config from '../../config.js';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('middlewares/load-token');

export default async (request, next) => {
  debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] Request: %O', request));

  // No Auth Cookie
  const cookieString = validate(request.headers.cookie, 'string');
  if(!cookieString || !cookieString.includes('access_token') && !cookieString.includes('refresh_token')){
    next(); return;
  }

  // Retrive Token IDs
  const cookies = request.headers.cookie.match(/\w+=\w+/g);
  let accessTokenId = false;
  let refreshTokenId = false;

  // Retrieving this way to be able accept more cookies in the future
  for(const cookie of cookies){
    if(cookie.includes('access_token')){
      accessTokenId = cookie.split('=')[1];
    }
    else if(cookie.includes('refresh_token')){
      refreshTokenId = cookie.split('=')[1];
    }
  }
  debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] Access Token ID: %O\n Refresh Token ID: %O', accessTokenId, refreshTokenId));

  // Validate
  const tokenIdLength =  20;

  // If both false, dont assign
  if(!validate(accessTokenId, 'token', {equal: tokenIdLength}) && !validate(refreshTokenId, 'token', {equal: tokenIdLength})){
    next(); return;
  }

  // Load token
  if(accessTokenId){
    const tokenData = await _data.read('tokens', accessTokenId);
    debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] Access Token Data: %O', tokenData));

    // Verify that the token has not expired
    if(tokenData.expires <= Date.now()){
      next(); return;
    }

    request.token = tokenData;
    debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] New Request: %O', request));
    next(); return;
  }
  // If only refresh token is valid, then renew tokens
  else if(refreshTokenId){
    const tokenData = await _data.read('tokens', refreshTokenId);
    debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] Refresh Token Data: %O', tokenData));

    // Verify that the token has not expired
    if(tokenData.expires <= Date.now()){
      next(); return;
    }

    const tokenIdLength = config.token.tokenIdLength;
    const accessTokenExpires = config.token.accessTokenExpires;
    const refreshTokenExpires = config.token.refreshTokenExpires;

    const [accessToken, refreshToken] = await createTokens(tokenData.phone, tokenIdLength, accessTokenExpires, refreshTokenExpires);
    const setCookieHeader = generateCookieHeader(accessToken, refreshToken);
  
    request.token = accessToken;
    request.setHeader = setCookieHeader; // Send back as headers in res object
    debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] New Token: %O', accessToken));
    debug(formatWithOptions({colors: true}, '[MIDDLEWARES][LOAD_TOKEN] New Request: %O', request));
    next(); return;
  }
};