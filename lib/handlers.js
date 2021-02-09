const { time } = require('console');
const path = require('path');
const config = require(path.join(__dirname, '..', 'config'));
const _data = require(path.join(__dirname, 'data'));
const helpers = require(path.join(__dirname, 'helpers'));


let handlers = {};

handlers.ping = (data, callback) => {
  console.log(data);
  callback(200);
};

/*
* Users
*/
handlers.users = (data, callback) => {
  const acceptbleMethods = ['post', 'get', 'put', 'delete'];
  if(acceptbleMethods.indexOf(data.method >= 0)){
    handlers._users[data.method](data, callback);
  }else{
    callback(405);  
  }
};

handlers._users = {};
handlers._users.ddPlusNumberlength = 11;

// Required data: phone
// Optional data: none
// Only let an authenticated user access their object. Don't let them access anyone else's
handlers._users.get = (data, callback) => {
  // Check that the phone number is valid
  const ddPlusNumberlength = handlers._users.ddPlusNumberlength;
  const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == ddPlusNumberlength ? data.queryStringObject.phone.trim() : false;

  if(phone){
    // Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token  is valid for the phone number
    handlers._tokens.verifyToken(token, phone, tokenIsvalid => {
      if(tokenIsvalid){
        _data.read('users', phone, (err, user) => {
          if(!err && user){
            // Remove the hashed password from the user object before returning it to the requester
            delete user.hashedPassword;
            callback(200, user);
          }else{
            callback(404);
          }
        });
      }else{
        callback(403, {Error: 'Missing required token in header, or token is invalid.'});
      }
    });
  }else{
    callback(400, {Error: 'Missing required field.'})
  }
};

// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  // Check that all required fields are filled out
  const ddPlusNumberlength = handlers._users.ddPlusNumberlength;

  const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == ddPlusNumberlength ? data.payload.phone.trim() : false; 
  const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true: false;
  

  if(firstName && lastName && phone && password && tosAgreement){
    // Make sure that the user doesn't already exist
    _data.read('users', phone, (err, data) => {
      if(err){
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if(hashedPassword){
          // Create the user object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword: hashedPassword,
            tosAgreement,
          };

          // Store the user
          _data.create('users', phone, userObject, err => {
            if(!err){
              // Remove the hashed password from the user object before returning it to the requester
              delete userObject.hashedPassword;
              callback(200, userObject);
            }else{
              console.log(err);
              callback(500, {Error: 'Could not create the new user.'});
            }
          });
        }else{
          callback(500, {Error: 'Could not hash the user\'s password.'})
        }

      }else{
        // User already exists
        callback(400, {Error: 'A user with that phone number already exists.'})
      }
    });
  }else{
    callback(400, {Error: 'Missing required fields.'});
  }
};

// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// Only let an authenticated user update their object. Don't let them update anyone else's
handlers._users.put = (data, callback) => {

  // Check that the phone number is valid
  const ddPlusNumberlength = handlers._users.ddPlusNumberlength;
  const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == ddPlusNumberlength ? data.payload.phone.trim() : false;

  // Check for the optional fields
  const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if phone is invalid
  if(phone){

    // Error if nothing is sent to update
    if(firstName || lastName || password){
      // Get the token from the headers
      const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      // Verify that the given token  is valid for the phone number
      handlers._tokens.verifyToken(token, phone, tokenIsvalid => {
        if(tokenIsvalid){
          // Look up the user data
          _data.read('users', phone, (err, userData) => {
            if(!err && userData){
              // update the fields
              if(firstName){
                userData.firstName = firstName;
              }
              if(lastName){
                userData.lastName = lastName;
              }
              if(password){
                userData.hashedPassword = helpers.hash(password);
              }
            
              // Store the new updates
              _data.update('users', phone, userData, err => {
                if(!err){
                  // Remove the hashed password from the user object before returning it to the requester
                  delete userData.hashedPassword;
                  callback(200, userData);
                }else{
                  console.log(err);
                  callback(500, {Error: 'Could not update the user.'});
                }
              });
            }else{
              callback(400, {Error: 'The specified user does\'nt exists.'});
            }
          });
        }else{
          callback(403, {Error: 'Missing required token in header, or token is invalid.'});
        }
      });
    }else{
      callback(400, {Error: 'Missing fields to update.'});
    }
  }else{
    callback(400, {Error: 'Missing required field.'});
  }
};

// Required data: phone
// Optional data: none
// Only let an authenticated user delete their object. Don't let them delete anyone else's
// Cleanup (delete) any other data file associated with this user
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  const ddPlusNumberlength = handlers._users.ddPlusNumberlength;
  const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == ddPlusNumberlength ? data.queryStringObject.phone.trim() : false;

  if(phone){
    // Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token  is valid for the phone number
    handlers._tokens.verifyToken(token, phone, tokenIsvalid => {
      if(tokenIsvalid){
        _data.read('users', phone, (err, userData) => {
          if(!err && userData){
           _data.delete('users', phone, err => {
            if(!err){

              // Delete each of the checks associeted with the user
              const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
              const checksToDelete = userChecks.length;

              if(checksToDelete > 0){
                for(let i = 0; i < checksToDelete; i++){
                  _data.delete('checks', userChecks[i], err => {
                    if(err){
                      console.log(err);
                      callback(500, {Error: 'Could not delete the checks associted with the user.'});
                    }
                  });
                }
                callback(200);
              }else{
                callback(200);
              }
            }else{
              console.log(err);
              callback(500, {Error: 'Could not delete the specified user.'})
            }
           });
          }else{
            callback(400, {Error: 'Could not find the specified user.'});
          }
        });
      }else{
        callback(403, {Error: 'Missing required token in header, or token is invalid.'});
      }
    });
  }else{
    callback(400, {Error: 'Missing required field.'})
  }
};


/*
* tokens
*/
handlers.tokens = (data, callback) => {
  const acceptbleMethods = ['post', 'get', 'put', 'delete'];
  if(acceptbleMethods.indexOf(data.method >= 0)){
    handlers._tokens[data.method](data, callback);
  }else{
    callback(405);  
  }
};


handlers._tokens = {};
handlers._randomIdLength = 20;
handlers._hourInMilliseconds = 1000 * 60 * 60;

// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // Check that the id is valid
  const tokenIdLength = handlers._randomIdLength;
  const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == tokenIdLength ? data.queryStringObject.id.trim() : false;

  if(id){
    _data.read('tokens', id, (err, tokenData) => {
      if(!err && tokenData){
        callback(200, tokenData);
      }else{
        callback(404);
      }
    });
  }else{
    callback(400, {Error: 'Missing required field.'})
  }
};

// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  const ddPlusNumberlength = handlers._users.ddPlusNumberlength;
  const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == ddPlusNumberlength ? data.payload.phone.trim() : false; 
  const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if(phone && password){
    _data.read('users', phone, (err, userData) => {
      if(!err && userData){
        // Hash the sent password in order to compare it to the password stored in user object
        const hashedPassword = helpers.hash(password);

        // If valid create a new token with random name. Set expiration date 1 hour in the future
        if(hashedPassword == userData.hashedPassword){
          const tokenId = helpers.createRandomString(handlers._randomIdLength);
         
          const expires = Date.now() + handlers._hourInMilliseconds;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, err => {
            if(!err){
              callback(200, tokenObject);
            }else{
              console.log(err);
              callback(500, {Error: 'Could not create the new token.'});
            }
          });
        }else{
          callback(400, {Error: 'Password did not match the specified user\'s stored password.'});
        }
      }else{
        callback(400, {Error: 'Could not found the specified user.'});
      }
    });
  }else{
    callback(400, {Error: 'Missing required fields.'});
  }
};

// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  const tokenIdLength = handlers._randomIdLength;
  const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == tokenIdLength ? data.payload.id.trim() : false;
  const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

  if(id && extend){
    _data.read('tokens', id, (err, tokenData) => {
      if(!err && tokenData){
        // Check to make sure that the token isn't already expired
        if(tokenData.expires > Date.now()){
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + handlers._hourInMilliseconds;

          // Store the new updates
          _data.update('tokens', id, tokenData, err => {
            if(!err){
              callback(200, tokenData);
            }else{
              callback(400, {Error: 'Could not update the token\'s expiration date.'})
            }
          });
        }else{
          callback(400, {Error: 'The token has already expired and cannot be extended.'}); 
        }
      }else{
        callback(404, {Error: 'Specified token doesn\'t exists.'});
      }
    });
  }else{
    callback(400, {Error: 'Missing required fields.'});
  }
};

// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that the id is valid
  const tokenIdLength = handlers._randomIdLength;
  const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == tokenIdLength ? data.payload.id.trim() : false;

  if(id){
    _data.read('tokens', id, (err, tokenData) => {
      if(!err && tokenData){
       _data.delete('tokens', id, err => {
        if(!err){
          callback(200);
        }else{
          console.log(err);
          callback(500, {Error: 'Could not delete the specified token.'})
        }
       });
      }else{
        callback(400, {Error: 'Could not find the specified token.'});
      }
    });
  }else{
    callback(400, {Error: 'Missing required field.'})
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {

  // Look up the token
  _data.read('tokens', id, (err, tokenData) => {
    if(!err && tokenData){
      // Check that the token is for the given user and has not expired
      if(tokenData.phone == phone && tokenData.expires > Date.now()){
        callback(true);
      }else{
        callback(false);
      }
    }else{
      callback(false);
    }
  });
};

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

module.exports = handlers;