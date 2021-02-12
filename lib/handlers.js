import config from '../config.js';
import _data from './data.js';
import helpers from './helpers.js';


let handlers = {};

/*
* Checks
*/
handlers.checks = (data, callback) => {
  const acceptbleMethods = ['post', 'get', 'put', 'delete'];
  if(acceptbleMethods.indexOf(data.method >= 0)){
    handlers._checks[data.method](data, callback);
  }else{
    callback(405);  
  }
};

handlers._checks = {};
handlers._protocols = ['http', 'https'];
handlers._methods = ['get', 'post', 'put', 'delete'];

// Required data: id
// Optional: none
handlers._checks.get = (data, callback) => {
 // Check that the id is valid
 const tokenIdLength = handlers._randomIdLength;
 const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == tokenIdLength ? data.queryStringObject.id.trim() : false;

 if(id){
  // Look up the check
  _data.read('checks', id, (err, checkData) => {
    if(!err && checkData){
      // Get the token from the headers
      const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
         
      // Verify that the given token  is valid and belongs to the user who created the check
      handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsvalid => {
        if(tokenIsvalid){

          // Return the checkData
          callback(200, checkData);
        }else{
          callback(403);
        }
      });
    }else{
      callback(404);
    }
  });
 }else{
   callback(400, {Error: 'Missing required field.'})
 }
};

// Required data: protocol, url, method, successCodes[], timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
  const protocols = handlers._protocols;
  const methods = handlers._methods;

  const protocol = typeof(data.payload.protocol) == 'string' && protocols.indexOf(data.payload.protocol.trim()) > -1 ? data.payload.protocol.trim() : false;
  const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) == 'string' && methods.indexOf(data.payload.method.trim()) > -1 ? data.payload.method.trim() : false;
  const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;  
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if(protocol && url && method && successCodes && timeoutSeconds){
    // Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Look up the user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if(!err && tokenData){
        const userPhone = tokenData.phone;

        _data.read('users', userPhone, (err, userData) => {
          if(!err && userData){
            const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

            // Verify that the user has less than the number of max-checks-per-user
            if(userChecks.length < config.maxChecks){
              // Create random id for the check
              const checkId = helpers.createRandomString(handlers._randomIdLength);

              // Create the check object and include the user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds,
              };

              // save the object
              _data.create('checks', checkId, checkObject, err => {
                if(!err){

                  // Add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new userData
                  _data.update('users', userPhone, userData, err => {
                    if(!err){
                      // Return the data about the new check
                      callback(200, checkObject);
                    }else{
                      callback(500, {Error: 'could not update the user with the new check.'});
                    }
                  });
                }else{
                  console.log(err);
                  callback(500, {Error: 'Could not create the new check.'});
                }
              });

            }else{
              callback(400, {Error: `The user already has the maximum number of checks (${config.maxChecks})`});
            }
          }else{
            callback(403);
          }
        })
      }else{  
        callback(403);
      }
    });
      
  }else{
    callback(400, {Error: 'Missing required inputs or inputs are invalid.'});
  }
};

// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
handlers._checks.put = (data, callback) => {
  
  // Check that the id is valid
  const tokenIdLength = handlers._randomIdLength;
  const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == tokenIdLength ? data.payload.id.trim() : false;

  // Check for the optional fields
  const protocols = handlers._protocols;
  const methods = handlers._methods;

  const protocol = typeof(data.payload.protocol) == 'string' && protocols.indexOf(data.payload.protocol.trim()) > -1 ? data.payload.protocol.trim() : false;
  const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) == 'string' && methods.indexOf(data.payload.method.trim()) > -1 ? data.payload.method.trim() : false;
  const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;  
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if(id){
    // Error if nothing is sent to update
    if(protocol || url || method || successCodes || timeoutSeconds){
      
      // Lookup the check
      _data.read('checks', id, (err, checkData) => {
        if(!err && checkData){

          // Get the token from the headers
          const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

          // Verify that the given token  is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsvalid => {
            if(tokenIsvalid){
              
              // Update the check where necessary
              if(protocol){
                checkData.protocol = protocol;
              }
              if(url){
                checkData.url = url;
              }
              if(method){
                checkData.method = method;
              }
              if(successCodes){
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds){
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Save the update
              _data.update('checks', id, checkData, err => {
                if(!err){
                  callback(200, checkData);
                }else{
                  callback(500, {Error: 'Could not update the check.'});
                }
              });
            }else{
              callback(403);
            }
          });
        }else{
          callback(400, {Error: 'Check ID doesn\'t exist'})
        }
      });
    }else{
      callback(400, {Error: 'Missing fields to update.'});
    }
  }else{
    callback(400, {Error: 'Missing required field.'});
  }

};

// Request data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
  // Check that the id is valid
  const tokenIdLength = handlers._randomIdLength;
  const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == tokenIdLength ? data.payload.id.trim() : false;

  if(id){
    // Lookup the theck
    _data.read('checks', id, (err, checkData) => {
      if(!err && checkData){
        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsvalid => {
          if(tokenIsvalid){

            // Delete the check data
            _data.delete('checks', id, err => {
              if(!err){
                _data.read('users', checkData.userPhone, (err, userData) => {
                  if(!err && userData){
                    
                    // Remove the deleted check data from user's check array
                    const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                    const deletedCheckPosition = userChecks.indexOf(id);
                    
                    if(deletedCheckPosition > -1){
                      userChecks.splice(deletedCheckPosition, 1);
                      userData.checks = userChecks;

                      // Update user data
                      _data.update('users', userData.phone, userData, err => {
                        if(!err){
                          callback(200, userData);
                        }else{
                          callback(500, {Error: 'Could not update the user\'s check.'});
                        }
                      });
                    }else{
                      callback(500, {Error: 'Could not find the check on the user\'s object.'});
                    }

                  }else{
                    callback(500, {Error: 'Could not find the user who created the check.'});
                  }
                });
              }else{
                callback(500, {Error: 'Could not delete the check data.'});
              }
            });
          }else{
            callback(403, {Error: 'Missing required token in header, or token is invalid.'});
          }
        });
      }else{
        callback(404, {Error: 'The specified check ID doesn\'t exist.'});
      }
    });
  }else{
    callback(400, {Error: 'Missing required field.'})
  }
};


handlers.notFound = (data, callback) => {
  callback(404);
};

export default handlers;