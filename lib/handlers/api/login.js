/*
* Login Handler
*/
import _data from '../../data.js';
import { validate, invalidFields, createRandomString, hash } from '../../helpers.js';
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

    // Create token
    const tokenObject = {
      id: createRandomString(this._tokenIdLength),
      phone,
      expires: Date.now() + this._hourInMilliseconds,
    }

    // Save
    await _data.create('tokens', tokenObject.id, tokenObject);
      
    // If user already had one, delete the old one
    if(request.token){
      await _data.delete('tokens', request.token.id);
    }
      
    debug(formatWithOptions({colors: true}, '[LOGIN] Response: %O', tokenObject));
    return {status: 200, payload: tokenObject, contentType: 'application/json'};
    
  },
  _tokenIdLength: 20,
  _hourInMilliseconds: 60 * 60 * 1000,
}