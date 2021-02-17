/*
* Login Handler
*/
import _data from '../../data.js';
import { validate, invalidFields, hash, generateCookieHeader, createTokens } from '../../helpers.js';
import config from '../../../config.js';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('login');

export default {
  
  // Request data: phone, password
  // Optional data: none
  async post(request) {
    debug(formatWithOptions({colors: true}, '[LOGIN] Request: %O', request));
  
    // Validate
    const phone = validate(request.payload.phone, 'string', {equal: this._ddPlusNumberLength});
    const password = validate(request.payload.password, 'string');
    debug(formatWithOptions({colors: true}, '[LOGIN] Validation: %O', {phone, password}));

    if(!phone || !password){
      const invalid = invalidFields({phone, password}).join(', ');
      return {status: 400, payload: {err: 'Validation', message: `Missing or invalid required fields: ${invalid}.`}, contentType: 'application/json'};
    }

    // Lookup the user data
    let errObj = {status: 404, payload: {err: 'Bad Request', message: 'User doesn\'t exist.'}, contentType: 'application/json'};
    const userData = await _data.read('users', phone, errObj);

    // Compare passwords
    if(userData.hashedPassword != hash(password)){
      return {status: 400, payload: {err: 'Bad Request', message: 'Wrong password.'}, contentType: 'application/json'};
    }

    // Create tokens
    const tokenIdLength = config.token.tokenIdLength;
    const accessTokenExpires = config.token.accessTokenExpires;
    const refreshTokenExpires = config.token.refreshTokenExpires;

    const [accessToken, refreshToken] = await createTokens(phone, tokenIdLength, accessTokenExpires, refreshTokenExpires);
      
    debug(formatWithOptions({colors: true}, '[LOGIN] Access Token: %O\nRefresh Token: %O', accessToken, refreshToken));
    return {status: 200, payload: {}, contentType: 'application/json', headers: generateCookieHeader(accessToken, refreshToken)};
    
  },
  _ddPlusNumberLength: 11,
}