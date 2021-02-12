/*
* Checks Handler
*/
import _data from '../data.js';
import { validate, invalidFields, createRandomString, hash } from '../helpers.js';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('checks');

export default {

  async get(request) {

  },

  // Required data: protocol, url, method, successCodes[], timeoutSeconds
  // Optional data: none
  async post(request) {
    debug(formatWithOptions({colors: true}, '[CHECKS][POST] Request: %O', request));

    // Validate
    const protocol = validate(request.payload.protocol, 'enum', {enumArr: this._protocols});
    const url = validate(request.payload.url, 'string');
    const method = validate(request.payload.method, 'enum', {enumArr: this._methods});
    const successCodes = validate(request.payload.successCodes, 'array');
    const timeoutSeconds = validate(request.payload.timeoutSeconds, 'number', {integer: true});
    debug(formatWithOptions({colors: true}, '[CHECKS][POST] Validation: %O', {protocol, url, method, successCodes, timeoutSeconds}));

    if(protocol && url && method && successCodes && timeoutSeconds){
      // Look up the user
      const userData = await _data.read('users', request.token.phone);

      // Load user checks
      const userChecks

    }else{
      const invalid = invalidFields({protocol, url, method, successCodes, timeoutSeconds}).join(', ');
      return {status: 400, payload: {err: 'Validation', message: `Missing or invalid required fields: ${invalid}.`}};
    }
  },

  async put(request) {

  },
  
  async delete(request) {

  },
  _protocols = ['http', 'https'],
  _methods = ['get', 'post', 'put', 'delete'],
  _tokenIdLength = 20,
}