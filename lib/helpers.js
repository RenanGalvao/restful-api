/*
* Helpers
*/
import crypto from 'crypto';
import querystring from 'querystring';
import https from 'https';
import config from '../config.js';
import _data from './data.js';
import fs from 'fs';
import path from 'path';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('helpers');

let helpers = {};

/*
* Create a SHA256 hash
*/
helpers.hash = (str) => {
  if(typeof(str) == 'string' && str.length > 0){
    const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  }else{
    return false;
  }
};

/* 
* Parse a JSON string to an object in all cases, without throwing
*/
helpers.parseJsonToObject = (str) => {
  try{
    return JSON.parse(str);
  }catch(e){
    return {};
  }
};

/*
* Create a string of random alphanumeric characters of given length
*/
helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

  if(strLength){
    // Define all the possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    let str = '';
    for(let i = 0; i < strLength; i++){
      // Get a random character from the possibleCharacters string
      let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

      // Append this character to the final string
      str += randomCharacter;
    }

    return str;
  }else{
    return false;
  }
};

/*
* Send a SMS message via Twilio
*/
helpers.sendTwilioSms = (phone, msg, callback) => {
  // Validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 11 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

  if(phone && msg){
    // configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: `+55${phone}`,
      Body: msg, 
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // Configure the request details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Contenty-Length': Buffer.byteLength(stringPayload),
      },
    };

    // Instantiate the request object
    const req = https.request(requestDetails, res => {
      // Grab the status  of the sent request
      const status = res.statusCode;

      // callback successfuly if the request through
      if(status == 200 || status == 201){
        callback(200);
      }else{
        callback(`Status code returned was ${status}`)
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', err => {
      callback(err);
    });

    // Add the payload to the request
    req.write(stringPayload);

    // End the request (send)
    req.end();

  }else{
    callback('Given parameters were missing or invalid.');
  }
};

/*
* Returns which fields are invalid
* obj = { fieldName: fieldValue, ... }
*/
helpers.invalidFields = obj => {
  const invalidFields = [];

  for(const [key, value] of Object.entries(obj)){
    if(!value){
      invalidFields.push(key);
    }
  };

  return invalidFields;
};

/* 
* Validates input
*/
helpers.validate = (input, expectedType, {min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, equal = 0, enumArr = [], integer = false} = {}) => {
  debug(formatWithOptions({colors: true}, '[HELPERS][VALIDATE][INPUT] Input: %O\nExpected Type: %O\nMin: %O\nMax: %O\nEnum Array:', input, expectedType, min, max, enumArr));

  switch(expectedType){
    case 'string':
      if(min != Number.MIN_SAFE_INTEGER || max != Number.MAX_SAFE_INTEGER){
        return typeof input == 'string' && input.trim().length >= min && input.trim().length <= max ? input.trim() : false;
      }else if(equal != 0){
        return typeof input == 'string' && input.trim().length == equal ? input.trim() : false;
      }else{
        return typeof input == 'string' && input.trim().length > 0 ? input.trim() : false;
      }
    case 'number':
      let tmp = typeof input == 'number' && input >= min && input <= max ? input : false;
      if(tmp){
        // Only exclusive when integer == true
        tmp = !integer ? tmp : tmp % 1 == 0 ? tmp : false;
      }
      return tmp;
    case 'boolean':
      return typeof input == 'boolean' ? input : undefined;
    case 'email':
      const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
      return typeof input == 'string' && input.trim().length > 0 && emailRegex.test(input.trim()) ? input.trim() : false;
    case 'enum':
      return typeof input == 'string' && input.trim().length > 0 && enumArr.includes(input.trim()) ? input.trim() : false;
    case 'token':
      return typeof input == 'string' && input.trim().length == equal ? input.trim() : false;
    case 'array':
      return typeof input == 'object' && input instanceof Array && input.length > 0 ? input : false;  
      default:
      return false;
  }
};

/*
* Handle all errors from routes
*/
helpers.errorHandler = (err = {}) => {
  debug(formatWithOptions({colors: true}, '[HELPERS][ERROR_HANDLER] Object: %O', err));

  if(typeof err.status != 'undefined' && typeof err.payload != 'undefined'){
    return err;
  }else if(typeof err.status != 'undefined'){
    return {status: err.status, payload: {}, contentType: 'application/json'};
  }else{
    // Last resort, default res
    return {status: 500, payload: {err: 'Internal', message: 'We\'re working on it :('}, contentType: 'application/json'}; 
  }
};

/*
* Retrieve HTML templates
*/
helpers.getTemplate = async (dir, templateName, data = {}, headerName = '_header', footerName = '_footer', custom_err = {}) => {
  debug(formatWithOptions({colors: true}, '[HELPERS][GET_TEMPLATE] Dir: %O\nTemplate Name: %O\n Custom ERR: %O', dir, templateName, custom_err));
  const templateBaseDir = path.join(path.resolve('lib'), '..', 'templates');
  let headerTemplate = '';
  let footerTemplate = '';
  
  return new Promise((resolve, reject) => {
    if(headerName != ''){
      try{
        headerTemplate = helpers.interpolate(fs.readFileSync(path.join(templateBaseDir, `${headerName}.html`), 'utf-8'), data);
      }catch(err){
        debug(formatWithOptions({colors: true}, '[HELPERS][GET_TEMPLATE] Error: %O', err));
        reject(custom_err);
      }
    }

    if(footerName != ''){
      try{
        footerTemplate = helpers.interpolate(fs.readFileSync(path.join(templateBaseDir, `${footerName}.html`), 'utf-8'), data);
      }catch(err){
        debug(formatWithOptions({colors: true}, '[HELPERS][GET_TEMPLATE] Error: %O', err));
        reject(custom_err);
      }
    }

    fs.readFile(path.join(templateBaseDir, dir, `${templateName}.html`), 'utf-8', (err, html) => {
      if(!err && html){
        debug(formatWithOptions({colors: true}, '[HELPERS][GET_TEMPLATE] Response: %O', html));
        resolve(`${headerTemplate}${interpolate(html, data)}${footerTemplate}`);
      }else{
        debug(formatWithOptions({colors: true}, '[HELPERS][GET_TEMPLATE] Error: %O', err));
        reject(custom_err);
      }
    });
  });
}

/*
* Take a given string and a data object, find/replace all the keys within it
*/
helpers.interpolate = (str, data) => {
  // Add globals to data
  for(const key in config.templateGlobals){
    data[`global.${key}`] = config.templateGlobals[key];
  }

  // Add data to str
  for(const key in data){
    const replace = data[key];
    const find = new RegExp(`{${key}}`, 'g');
    str = str.replace(find, replace); 
  }

  return str
};

/*
* Retrieve static assets from public folder
*/
helpers.getStaticAsset = (pathToFile, custom_err = {}) => {
  debug(formatWithOptions({colors: true}, '[HELPERS][GET_STATIC_ASSET] Path To FIle: %O\nCustom ERR: %O', pathToFile, custom_err));
  
  return new Promise((resolve, reject) => {
    const publicBaseDir = path.join(path.resolve('lib'), '..', 'public');
    const fileExtension = pathToFile.lastIndexOf('.') > 0 ? pathToFile.substring(pathToFile.lastIndexOf('.') + 1) : false;

    if(!fileExtension){
      reject(custom_err)
    }
    
    // decodeURI to remove %20 and other things from URI
    fs.readFile(decodeURI(path.join(publicBaseDir, pathToFile)), (err, file) => {
      if(!err && file){
        debug(formatWithOptions({colors: true}, '[HELPERS][GET_STATIC_ASSET] Response: %O', file));
        resolve([file, helpers.getContentType(fileExtension)]);
      }else{
        debug(formatWithOptions({colors: true}, '[HELPERS][GET_STATIC_ASSET] Error: %O', err));
        reject(custom_err);
      }
    })
  });
};

/*
* Determine the Content type of a given file (default to plain text)
*/
helpers.getContentType = ext => {
  switch(ext){
    case 'css':
      return 'text/css';
    case 'gif':
      return 'image/gif';
    case 'ico':
      return 'image/x-icon';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'js':
      return 'application/javascript';
    case 'png':
      return 'image/png';
    case 'pdf':
      return 'application/pdf';
    case 'rar': 
      return 'application/x-rar-compressed';
    case 'svg':
      return 'image/svg+xml';
    case 'webm':
      return 'video/webm';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
};

/*
* Cookies
*/
helpers.generateCookieHeader = (access_token, refresh_token) => {
  debug(formatWithOptions({colors: true}, '[HELPERS][GENERATE_COOKIE_HEADER] Access Token: %O\nRefresh Token: %O', access_token, refresh_token));
  
  return {
    'Set-Cookie': [
      `access_token=${access_token.id}; Max-Age=${access_token.maxAge}; HttpOnly; Path=/; SameSite=Lax; ${process.env.NODE_ENV == 'production' ? 'Secure' : ''};`,
      `refresh_token=${refresh_token.id}; Max-Age=${refresh_token.maxAge}; HttpOnly; Path=/; SameSite=Lax; ${process.env.NODE_ENV == 'production' ? 'Secure' : ''};`  
    ]
  }
};

// Destroy both access and refresh tokens
helpers.deleteCookieHeader = () => {
  return {
    'Set-Cookie': [
      `access_token=no_id; Max-Age=-1; HttpOnly; Path=/; SameSite=Lax; ${process.env.NODE_ENV == 'production' ? 'Secure' : ''};`,
      `refresh_token=no_id; Max-Age=-1; HttpOnly; Path=/; SameSite=Lax; ${process.env.NODE_ENV == 'production' ? 'Secure' : ''};`
    ]
  }
};

/*
* Create and Save tokens
*/
helpers.createTokens = async (phone, tokenIdLength, accessTokenMaxAge, refreshTokenMaxAge) => {
  const access_token = {
    id: createRandomString(tokenIdLength),
    phone,
    maxAge: accessTokenMaxAge,
  };
  const refresh_token = {
    id: createRandomString(tokenIdLength),
    phone,
    maxAge: refreshTokenMaxAge,
  };

  // Save
  await _data.create('tokens', access_token.id, access_token);
  await _data.create('tokens', refresh_token.id, refresh_token);

  return [access_token, refresh_token];
};

export default helpers;
export const {
  createRandomString,
  hash,
  parseJsonToObject,
  sendTwilioSms,
  invalidFields,
  validate,
  errorHandler,
  getTemplate,
  interpolate,
  getStaticAsset,
  getContentType,
  generateCookieHeader,
  deleteCookieHeader,
  createTokens,
} = helpers;