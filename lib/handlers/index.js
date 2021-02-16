/*
* Route Handlers
*/
import _users from './api/users.js';
import _login from './api/login.js';
import _logout from './api/logout.js';
import _checks from './api/checks.js';
import _account from './gui/account.js';
import _session from './gui/session.js';
import _checksGui from './gui/checksGui.js';
import loadToken from '../middlewares/loadToken.js';
import verifyToken from '../middlewares/verifyToken.js';
import { errorHandler, getTemplate, getStaticAsset } from '../helpers.js';
import { debuglog, formatWithOptions } from 'util';
import path from 'path';

// Setting debug name for the file
const debug = debuglog('handlers');

// Lib object
let handlers = {};



/*-- Start GUI Handlers --*/

handlers.index = async request => {
  debug(formatWithOptions({colors: true}, '[INDEX][HANDLER] Request: %O', request));
  
  if(request.method != 'get'){
    return handlers._methodNotAllowed;
  }

  try{
    const data = {
      'head.title': 'Uptime Monitoring - Made Simple',
      'head.description': 'We offer free, simple uptime monitoring for HTTP/S sites of all kinds. When your site does down we\'ll send you a text to let you know.',
      'body.class': 'index',

    }
    const payload = await getTemplate('', 'index', data);
    return {status: 200, payload, contentType: 'html'};
  }catch(err){
    return errorHandler(err);
  }
}

handlers.account = async request => {
  debug(formatWithOptions({colors: true}, '[ACCOUNT][HANDLER] Request: %O', request));
  const acceptedRoutes = ['create', 'edit', 'deleted'];

  if(request.method != 'get'){ 
    return handlers._methodNotAllowed;
  }
  if(!acceptedRoutes.includes(request.slugs[0])){
    return handlers.notFound(request);
  }
    
  return handlers._callSubGui(request, _account, acceptedRoutes);
};

handlers.session = async request => {
  debug(formatWithOptions({colors: true}, '[SESSION][HANDLER] Request: %O', request));
  const acceptedRoutes = ['create', 'deleted'];

  if(request.method != 'get'){ 
    return handlers._methodNotAllowed;
  }
  if(!acceptedRoutes.includes(request.slugs[0])){
    return handlers.notFound(request);
  }
    
  return handlers._callSubGui(request, _session, acceptedRoutes);
};

handlers.checksGui = async request => {
  debug(formatWithOptions({colors: true}, '[CHECKS_GUI][HANDLER] Request: %O', request));
  const acceptedRoutes = ['all', 'create', 'edit'];

  if(request.method != 'get'){ 
    return handlers._methodNotAllowed;
  }
  if(!acceptedRoutes.includes(request.slugs[0])){
    return handlers.notFound(request);
  }
    
  return handlers._callSubGui(request, _checksGui, acceptedRoutes);
};

/*-- End GUI Handlers --*/



/*-- Start API Handlers --*/

/*
* Users
*/
handlers.users = async request => {
  debug(formatWithOptions({colors: true}, '[USERS][HANDLER] Request: %O', request));

  if(request.method != 'post'){
    const err = await handlers._useMiddleware(request, verifyToken);
    if(err){
      debug(formatWithOptions({colors: true}, '[USERS][HANDLER] Error: %O', err));
      return err;
    }
  }
  return handlers._callSubApi(request, _users, handlers._crudMethods);
}


/*
* Login
*/
handlers.login = async request => {
  debug(formatWithOptions({colors: true}, '[LOGIN][HANDLER] Request: %O', request));

  if(request.method == 'post'){
    return handlers._callSubApi(request, _login);
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
    return handlers._callSubApi(request, _logout);
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
    return handlers._callSubApi(request, _checks);
  }else{
    return handlers._methodNotAllowed;
  }
}

/*-- End API Handlers --*/



/*-- Start Static Asset Handlers --*/
handlers.favicon = async request => {
  debug(formatWithOptions({colors: true}, '[FAVICON][HANDLER] Request: %O', request));

  if(request.method != 'get'){
    return handlers._methodNotAllowed;
  }

  try{
    const [favicon, contentType] = await getStaticAsset('favicon.ico');
    return {status: 200, payload: favicon, contentType};
  }catch(err){
    return errorHandler(err);
  }
}

handlers.public = async request => {
  debug(formatWithOptions({colors: true}, '[PUBLIC][HANDLER] Request: %O', request));

  if(request.method != 'get'){
    return handlers._methodNotAllowed;
  }
  if(request.slugs.length == 0){
    return handlers.notFound(request);
  }

  // Set up the path to the file
  const pathToFile = path.join(...request.slugs);

  try{
    const [payload, contentType] = await getStaticAsset(pathToFile, handlers.notFound(request));
    return {status: 200, payload, contentType};
  }catch(err){
    return errorHandler(err);
  }
}
/*-- End Static Asset Handlers --*/


/*
* Handler Methods & properties
*/
handlers._methodNotAllowed = {status: 405, payload: {}, contentType: 'application/json'};
handlers._crudMethods = ['get', 'post', 'put', 'delete'];
handlers._baseRoutes = ['all', 'create', 'edit', 'deleted'];

handlers.notFound = request => {
  debug(formatWithOptions({colors: true}, '[NOT_FOUND][HANDLER] Request: %O', request));

  return {status: 404, payload: {}, contentType: 'application/json'};
};

handlers.ping = request => {
  debug(formatWithOptions({colors: true}, '[PING][HANDLER] Request: %O', request));

  if(request.method == 'get'){
    return {status: 200, payload: {message: 'pong'}, contentType: 'application/json'};
  }else{
    return handlers._methodNotAllowed;
  }
}

handlers._callSubApi = async (request, sub, acceptedMethods = handlers._crudMethods) => {
  debug(formatWithOptions({colors: true}, '[_CALL_SUB_API][HANDLER] Request: %O\nSub: %O\nAccepted Methods: %O\n', request, sub, acceptedMethods));

  if(acceptedMethods.includes(request.method)){
    try{
      return await sub[request.method](request);
    }catch(err){
      // Send all errors to this function, avoids try and catch inside controllers
      return errorHandler(err);
    }
  }else{
    return {status: 405, payload: {}, contentType: 'application/json'};
  }
};

handlers._callSubGui = async (request, sub, acceptedRoutes = handlers._baseRoutes) => {
  debug(formatWithOptions({colors: true}, '[_CALL_SUB_GUI][HANDLER] Request: %O\nSub: %O\nAccepted Routes: %O\n', request, sub, acceptedRoutes));

  if(acceptedRoutes.includes(request.slugs[0])){
    try{
      return await sub[request.slugs[0]](request);
    }catch(err){
      // Send all errors to this function, avoids try and catch inside controllers
      return errorHandler(err);
    }
  }else{
    return {status: 405, payload: {}, contentType: 'application/json'};
  }
}

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