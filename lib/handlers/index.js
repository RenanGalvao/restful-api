/*
* Route Handlers
*/
import _ping from './ping.js';
import _users from './users.js';
import _login from './login.js';
import _logout from './logout.js';
import _checks from './checks.js';
import loadToken from '../middlewares/loadToken.js';
import verifyToken from '../middlewares/verifyToken.js';
import { errorHandler } from '../helpers.js';
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
handlers.users = async request => {
  debug(formatWithOptions({colors: true}, '[USERS][HANDLER] Request: %O', request));

  if(request.method != 'post'){
    const err = await handlers._useMiddleware(request, verifyToken);
    if(err){
      return err;
    }
  }
  return handlers._callSub(request, _users, handlers._crudMethods);
}


/*
* Login
*/
handlers.login = async request => {
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
handlers.logout = async request => {
  debug(formatWithOptions({colors: true}, '[LOGOUT][HANDLER] Request: %O', request));

  if(request.method == 'get'){
    await handlers._useMiddleware(request, loadToken);
    return handlers._callSub(request, _logout);
  }else{
    return handlers._methodNotAllowed;
  }
}


/*
* Checks
*/
handlers.checks = async request => {
  debug(formatWithOptions({colors: true}, '[CHECKS][HANDLER] Request: %O', request));

  if(handlers._crudMethods.includes(request.method)){
    const err = await handlers._useMiddleware(request, verifyToken);
    if(err){
      return err;
    }
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
  debug(formatWithOptions({colors: true}, '[USERS][_CALLSUBG] Request: %O\nSub: %O\nAccepted Methods: %O\n', request, sub, acceptedMethods));

  if(acceptedMethods.includes(request.method)){
    try{
      return await sub[request.method](request);
    }catch(err){
      // Send all errors to this function, avoids try and catch inside controllers
      return errorHandler(err);
    }
  }else{
    return {status: 405, payload: {}};
  }
};

handlers._useMiddleware = async (request, fn, errMsg) => {
  debug(formatWithOptions({colors: true}, '[MIDDLEWARE][HANDLER] Request: %O', request));
  let error = false;

  await fn(request, (err) => {
    // If something goes wrong, will be a err
    if(err) {
      debug(formatWithOptions({colors: true}, '[MIDDLEWARE][HANDLER] Error: %O', err));
      error = err;
    }
  });

  if(error){
    return errorHandler(error);
  }
};

// Export
export default handlers;