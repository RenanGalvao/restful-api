/*
* User Handler 
*/
import _data from '../../data.js';
import { validate, invalidFields, hash } from '../../helpers.js';
import { debuglog, formatWithOptions } from 'util'; 

// Setting debug name for the file
const debug = debuglog('users');

export default {
  // Required data: none, use token
  // Optional data: none
  async get(request) {
    debug(formatWithOptions({colors: true}, '[USERS][GET] Request: %O', request));

    const userData = await _data.read('users', request.token.phone);
    delete userData.hashedPassword;

    debug(formatWithOptions({colors: true}, '[USERS][GET] Response: %O', userData));
    return {status: 200, payload: userData};
  },

  // Required data: firstName, lastName, phone, password, tosAgreement
  // Optional data: none
  async post(request) {
    debug(formatWithOptions({colors: true}, '[USERS][POST] Request: %O', request));

    // Validate
    const firstName = validate(request.payload.firstName, 'string');
    const lastName = validate(request.payload.lastName, 'string');
    const phone = validate(request.payload.phone, 'string', {equal: this._ddPlusNumberLength});
    const password = validate(request.payload.password, 'string');
    const tosAgreement = validate(request.payload.tosAgreement, 'boolean');
    debug(formatWithOptions({colors: true}, '[USERS][POST] Validation: %O', {firstName, lastName, phone, password, tosAgreement}));

    if(!firstName || !lastName || !phone || !password || !tosAgreement){
      const invalid = invalidFields({firstName, lastName, phone, password, tosAgreement}).join(', ');
      return {status: 400, payload: {err: 'Validation', message: `Missing or invalid required fields: ${invalid}.`}};
    }

    // Do not remove this try/catch block
    try{
      // Make sure users doesn't already exist
      await _data.read('users', phone);
      return {status: 400, payload: {err: 'Bad Request', message: 'A user with that phone already exists.'}}
    }catch{
      // Hash password
      const hashedPassword = hash(password);
      if(!hashedPassword){
        return {status: 500, payload: {err: 'Internal', message: 'Could not hash the user\'s password.'}};
      }
      // Create user object
      const userObject = {
        firstName,
        lastName,
        phone,
        hashedPassword,
        tosAgreement,
      };
      // Save
      await _data.create('users', phone, userObject);
      delete userObject.hashedPassword;
      debug(formatWithOptions({colors: true}, '[USERS][POST] Response: %O', userObject));
      return {status: 201, payload: userObject};
    }
  },

  // Required data: none, uses token
  // Optional data: firstName, lastName, phone, password
  async put(request) {
    debug(formatWithOptions({colors: true}, '[USERS][PUT] Request: %O', request));

    // Optional
    const firstName = validate(request.payload.firstName, 'string');
    const lastName = validate(request.payload.lastName, 'string');
    const optionalPhone = validate(request.payload.phone, 'string', {equal: this._ddPlusNumberLength});
    const password = validate(request.payload.password, 'string');
    debug(formatWithOptions({colors: true}, '[USERS][PUT] Validation: %O', {firstName, lastName, optionalPhone, password}));

    

    // At least one must be updated
    if(!firstName && !lastName && !optionalPhone && !password){
      const invalid = invalidFields({firstName, lastName, phone: optionalPhone, password}).join(', ');
      return {status: 400, payload: {err: 'Validation', message: `At leat one of them must be updated: ${invalid}.`}};
    }

    // Look up the user data
    const userData = await _data.read('users', request.token.phone);

    // Update object
    if(firstName){
      userData.firstName = firstName;
    }if(lastName){
      userData.lastName = lastName;
    }if(optionalPhone){
      userData.phone = phone;
    }if(password){
      userData.hashedPassword = hash(password);
    }

    // Save
    if(optionalPhone && optionalPhone != request.token.phone){
      await _data.create('users', optionalPhone, userData);
      // update token
      await _data.update('tokens', request.token.id, {...request.token, phone: optionalPhone});
    }else{
      await _data.update('users', request.token.phone, userData)
    }
      
    delete userData.hashedPassword;
    debug(formatWithOptions({colors: true}, '[USERS][PUT] Response: %O', userData));
    return {status: 200, payload: userData};
  },

  // Required data: none, uses /:phone
  // Optional data: none
  async delete(request) {
    debug(formatWithOptions({colors: true}, '[USERS][DELETE] Request: %O', request));

    // Validates the phone to prevent the user from accidentally deleting their account
    // Inside all API handlers, slug[0] is the route, the next one is our :phone
    const phone = validate(request.slugs[1], 'string', {equal: this._ddPlusNumberLength});
    debug(formatWithOptions({colors: true}, '[USERS][DELETE] VALIDATION: %O', {phone}));

    if(!phone){
      return {status: 400, payload: {err: 'Validation', message: `Missing /:phone`}};
    }

    // Look up user data and compare with the sent phone
    const userData = await _data.read('users', request.token.phone);
    if(userData.phone != phone){
      return {status: 400, payload: {err: 'Bad Request', message: 'You cannot delete others\' account.'}};
    }

    // Remove user
    await _data.delete('users', request.token.phone);

    // ... checks
    const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
    for(const check of userChecks){
      await _data.delete('checks', check);
    }

    // ... token
    await _data.delete('tokens', request.token.id);

    return {status: 204, payload: {}};
    
  },

  // Private properties
  _ddPlusNumberLength: 11,
}