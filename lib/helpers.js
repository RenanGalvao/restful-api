const crypto = require('crypto');
const path = require('path');

const config = require(path.join(__dirname, '..', 'config'));


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

module.exports = helpers;