/*
* Route Handlers
*/
import _ping from './ping.js';
import _users from './users.js';
import _login from './login.js';
import _logout from './logout.js';
import _checks from './checks.js';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('handlers');

// Lib object
let handlers = {};


/*
* Ping 
*/
handlers.ping = request => {
  debug(formatWithOptions({colors: true}, '[PING][HANDLER] Request: %O', request));

  if(request.method == 'get'){
    return _ping.get(request);
  }else{
    return handlers._methodNotAllowed;
  }
}


/*
* Users
*/
handlers.users = request => {
  debug(formatWithOptions({colors: true}, '[USERS][HANDLER] Request: %O', request));

  if(handlers._crudMethods.includes(request.method)){
    return handlers._callSub(request, _users);
  }else{
    return handlers._methodNotAllowed;
  }
}


/*
* Login
*/
handlers.login = request => {
  debug(formatWithOptions({colors: true}, '[LOGIN][HANDLER] Request: %O', request));

  if(request.method == 'post'){
    return handlers._callSub(request, _login);
  }else{
    return handlers._methodNotAllowed;
  }
}


/*
* Logout
*/
handlers.logout = request => {
  debug(formatWithOptions({colors: true}, '[LOGOUT][HANDLER] Request: %O', request));

  if(request.method == 'get'){
    return handlers._callSub(request, _logout);
  }else{
    return handlers._methodNotAllowed;
  }
}


/*
* Checks
*/
handlers.checks = request => {
  debug(formatWithOptions({colors: true}, '[CHECKS][HANDLER] Request: %O', request));

  if(handlers._crudMethods.includes(request.method)){
    return handlers._callSub(request, _checks);
  }else{
    return handlers._methodNotAllowed;
  }
}



/*
* Handler Methods & properties
*/
handlers._methodNotAllowed = {status: 405, payload: {}};
handlers._crudMethods = ['get', 'post', 'put', 'delete'];

handlers.notFound = request => {
  debug(formatWithOptions({colors: true}, '[NOT_FOUND][HANDLER] Request: %O', request));

  return {status: 404, payload: {}};
};

handlers._callSub = async (request, sub, acceptedMethods = handlers._crudMethods) => {
  if(acceptedMethods.includes(request.method)){
    
    try{
      return await sub[request.method](request);
    }catch(err){
      // Send all errors to this function, avoids try and catch inside controllers
      //return errorHandler(err);
    }

  }else{
    return {status: 405, payload: {}};
  }
};

// Export
export default handlers;