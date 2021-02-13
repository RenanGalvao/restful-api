/*
* Checks Handler
*/
import _data from '../data.js';
import { validate, invalidFields, createRandomString, hash } from '../helpers.js';
import { debuglog, formatWithOptions } from 'util';
import config from '../../config.js';

// Setting debug name for the file
const debug = debuglog('checks');

export default {

  // Required data: none, uses /:id
  // Optional data: none
  async get(request) {
    debug(formatWithOptions({colors: true}, '[CHECKS][GET] Request: %O', request));

    // Validate
    // Inside all API handlers, slug[0] is the route, the next one is our :id
    const id = validate(request.slugs[1], 'token', {equal: this._checkIdLength});
    debug(formatWithOptions({colors: true}, '[CHECKS][GET] Validation: %O', {id}));

    if(!id){
      return {status: 400, payload: {err: 'Validation', message: `Missing /:id`}};
    }

    // Look up the check
    const check = await _data.read('checks', id);

    // Verify that the user owns this check
    const userData = await _data.read('user', request.token.phone);
    if(!userData.checks.includes(id)){
      return {status: 400, payload: {err: 'Bad Request', message: 'This check doesn\'t belongs to you.'}};
    }

    debug(formatWithOptions({colors: true}, '[CHECKS][GET] Response: %O', check));
    return {status: 200, payload: check};
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

      // make sure user's checks is an array
      userData.checks = validate(userData.checks, 'array') ? userData.checks : [];

      // Verify that the user has less than the number of max-checks-per-user
      if(userData.checks.length >= config.maxChecks){
        return {status: 400, payload: {err: 'Bad Request', message: `You already has the maximum number of checks (${config.maxChecks})`}}
      }

      // Create check object
      const checkObject = {
        id: createRandomString(this._checkIdLength),
        phone: request.token.phone,
        protocol,
        url,
        method,
        successCodes,
        timeoutSeconds,
      };

      // Save
      await _data.create('checks', checkObject.id, checkObject);

      // Append to user data and update
      userData.checks.push(checkObject);
      await _data.update('users', request.token.phone, userData);

      debug(formatWithOptions({colors: true}, '[CHECKS][POST] Response: %O', checkObject));
      return {status: 201, payload: checkObject};
    }else{
      const invalid = invalidFields({protocol, url, method, successCodes, timeoutSeconds}).join(', ');
      return {status: 400, payload: {err: 'Validation', message: `Missing or invalid required fields: ${invalid}.`}};
    }
  },

  // Required data: id
  // Optional: protocl, url, method, successCodes, timeoutSeconds
  async put(request) {
    debug(formatWithOptions({colors: true}, '[CHECKS][PUT] Request: %O', request));

    // Required
    const id = validate(request.slugs[1], 'token', {equal: this._checkIdLength});

    // Optional
    const protocol = validate(request.payload.protocol, 'enum', {enumArr: this._protocols});
    const url = validate(request.payload.url, 'string');
    const method = validate(request.payload.method, 'enum', {enumArr: this._methods});
    const successCodes = validate(request.payload.successCodes, 'array');
    const timeoutSeconds = validate(request.payload.timeoutSeconds, 'number', {integer: true});
    debug(formatWithOptions({colors: true}, '[CHECKS][PUT] Validation: %O', {id, protocol, url, method, successCodes, timeoutSeconds}));

    if(!id){
      return {status: 400, payload: {err: 'Validation', message: `Missing /:id`}};
    }

    // Nothing was sent
    if(!protocol && !url && !method && !successCodes && !timeoutSeconds){
      const invalid = invalidFields({protocol, url, method, successCodes, timeoutSeconds}).join(', ');
      return {status: 400, payload: {err: 'Validation', message: `At leat one of them must be updated: ${invalid}.`}};
    }

    // Load check
    const checkData = await _data.read('checks', id);

    // Make sure that the requested check belongs to the user
    const userData = await _data.read('users', request.token.phone);
    if(!userData.checks.includes(id)){
      return {status: 400, payload: {err: 'Bad Request', message: 'This check doesn\'t belongs to you.'}};
    }

    // Update accordingly
    if(protocol){
      checkData.protocol = protocol;
    }if(url){
      checkData.url = url;
    }if(method){
      checkData.method = method;
    }if(successCodes){
      checkData.successCodes = successCodes;
    }if(timeoutSeconds){
      checkData.timeoutSeconds = timeoutSeconds;
    }

    // Update
    await _data.update('checks', id, checkData);

    debug(formatWithOptions({colors: true}, '[CHECKS][PUT] Response: %O', checkData));
    return {status: 200, payload: checkData};
  },
  
  // Request data: id
  // Optional data: none
  async delete(request) {
    debug(formatWithOptions({colors: true}, '[CHECKS][DELETE] Request: %O', request));

    // Validate
    const id = validate(request.slugs[1], 'token', {equal: this._checkIdLength});
    debug(formatWithOptions({colors: true}, '[CHECKS][PUT] Validation: %O', {id}));

    if(!id){
      return {status: 400, payload: {err: 'Validation', message: `Missing /:id`}};
    }

    // Make sure that the requested check belongs to the user or exists
    const userData = await _data.read('users', request.token.phone);
    if(!userData.checks.includes(id)){
      return {status: 400, payload: {err: 'Bad Request', message: 'This check doesn\'t belongs to you or doesn\'t exists.'}};
    }

    // Delete
    const removePosition = userData.checks.indexOf(id);
    userData.checks.splice(removePosition, 1);

    // Update user
    await _data.update('users', request.token.phone, userData);

    return {status: 204, payload: {}};
  },
  _protocols: ['http', 'https'],
  _methods: ['get', 'post', 'put', 'delete'],
  _checkIdLength: 20,
  _tokenIdLength: 20,
}