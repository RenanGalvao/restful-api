import crypto from 'crypto';
import path from 'path';
import querystring from 'querystring';
import https from 'https';
import config from '../config.js';


let helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if(typeof(str) == 'string' && str.length > 0){
    const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  }else{
    return false;
  }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {
  try{
    return JSON.parse(str);
  }catch(e){
    return {};
  }
};

// Create a string of random alphanumeric characters of given length
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

// Send a SMS message via Twilio
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

export default helpers;
export const {
  createRandomString,
  hash,
  parseJsonToObject,
  sendTwilioSms,
} = helpers;