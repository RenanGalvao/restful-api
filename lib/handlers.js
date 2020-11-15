const path = require('path');
const _data = require(path.join(__dirname, 'data'));
const helpers = require(path.join(__dirname, 'helpers'));


let handlers = {};

handlers.hello = (data, callback) => {
  callback(200, {message: "Welcome, dear visitor!"});
};

handlers.ping = (data, callback) => {
  callback(200);
};

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
// @TODO Only let an authenticated user access their object. Don't let them access anyone else's
handlers._users.get = (data, callback) => {
  // Check that the phone number is valid
  const ddPlusNumberlength = handlers._users.ddPlusNumberlength;
  const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == ddPlusNumberlength ? data.queryStringObject.phone.trim() : false;

  if(phone){
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
              callback(200);
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
// @TODO Only let an authenticated user update their object. Don't let them update anyone else's
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
      
      // Look up the user
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
              callback(200);
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
      callback(400, {Error: 'Missing fields to update.'});
    }
  }else{
    callback(400, {Error: 'Missing required field.'});
  }
};

// Required data: phone
// Optional data: none
// @TODO Only let an authenticated user delete their object. Don't let them delete anyone else's
// @TODO Cleanup (delete) any other data file associated with this user
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  const ddPlusNumberlength = handlers._users.ddPlusNumberlength;
  const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == ddPlusNumberlength ? data.queryStringObject.phone.trim() : false;

  if(phone){
    _data.read('users', phone, (err, user) => {
      if(!err && user){
       _data.delete('users', phone, err => {
        if(!err){
          callback(200);
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
    callback(400, {Error: 'Missing required field.'})
  }
};

handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;