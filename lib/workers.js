import path from 'path';
import fs from 'fs';
import _data from './data.js';
import http from 'http';
import https from 'https';
import helpers from './helpers.js';
import url from 'url';
import _logs from './logs.js';
import util from 'util';

const debug = util.debuglog('workers');

// Workers module object
let workers = {};

// Lookup all checks, get their data,  send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list('checks', (err, checks) => {
    if(!err && checks && checks.length > 0){
      checks.forEach(check => {
        // Read in the check data
        _data.read('checks', check, (err, originalCheckData) => {
          if(!err && originalCheckData){
            // Pass it to the check validator, and let that function continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          }else{
            debug('Error: Could not read one of the check\'s data.');
          }
        });
      });
    }else{
      debug("Error: Could not find any checks to process.");
    }
  });
};

// Sanity-check the check-data
workers._tokenLength = 20;
workers._phoneLength = 11;
workers._protocols = ['https', 'http'];
workers._methods = ['get', 'post', 'put', 'delete'];
workers._states = ['up', 'down'];

workers.validateCheckData = (checkData) => {
  checkData = typeof(checkData) == 'object' && checkData !== null ? checkData : {};
  checkData.id = typeof(checkData.id) == 'string' && checkData.id.trim().length == workers._tokenLength ? checkData.id.trim() : false;
  checkData.userPhone = typeof(checkData.userPhone) == 'string' && checkData.userPhone.trim().length == workers._phoneLength  ? checkData.userPhone.trim() : false;
  checkData.protocol = typeof(checkData.protocol) == 'string' && workers._protocols.indexOf(checkData.protocol) > -1  ? checkData.protocol : false;
  checkData.url = typeof(checkData.url) == 'string' && checkData.url.trim().length > 0 ? checkData.url.trim() : false;
  checkData.method = typeof(checkData.method) == 'string' && workers._methods.indexOf(checkData.method) > -1  ? checkData.method : false;
  checkData.successCodes = typeof(checkData.successCodes) == 'object' && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : false;
  checkData.timeoutSeconds = typeof(checkData.timeoutSeconds) == 'number' && checkData.timeoutSeconds % 1 == 0 && checkData.timeoutSeconds >=1 && checkData.timeoutSeconds <= 5 ? checkData.timeoutSeconds : false;

  // Set the keys that may not be set (if the workers have never seen this check before)
  checkData.state = typeof(checkData.state) == 'string' && workers._states.indexOf(checkData.state) > -1  ? checkData.state : 'down';
  checkData.lastChecked = typeof(checkData.lastChecked) == 'number' && checkData.lastChecked > 0 ? checkData.lastChecked : false;

  // If all the checks pass, pass the data along to the next step in the process
  if(
    checkData.id &&
    checkData.userPhone &&
    checkData.protocol &&
    checkData.url &&
    checkData.method &&
    checkData.successCodes &&
    checkData.timeoutSeconds){

      workers.performCheck(checkData);

  }else{
    debug('Error: one of the checks is not properly formatted. Skipping it.')
  }

};

// Perform the check, send the checkData and the outcome of the check process, to the next step
workers.performCheck = (checkData) => {
  // Prepare to initial check outcome
  let checkOutcome = {
    error: false,
    responseCode: false,
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the checkData data
  const parsedURL = url.parse(`${checkData.protocol}://${checkData.url}`, true);
  const hostname = parsedURL.hostname;
  const path = parsedURL.path; // Using path and not pathname because we want the querystring

  // Construct the request
  const requestDetails = {
    protocol: `${checkData.protocol}:`,
    hostname,
    method: checkData.method.toUpperCase(),
    path,
    timeout: checkData.timeoutSeconds * 1000,
  };

  // Instantiate the request object
  const _moduleToUse = checkData.protocol == 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;

    // Update the checkOutcome and pass data along
    checkOutcome.responseCode = status;
    if(!outcomeSent){
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', e => {
    // Update the checkOutcome and pass data along
    checkOutcome.error = {
      error: true,
      value: e
    };

    if(!outcomeSent){
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event 
  req.on('timeout', e => {
    // Update the checkOutcome and pass data along
    checkOutcome.error = {
      error: true,
      value: 'timeout'
    };

    if(!outcomeSent){
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Process the checkOutcome , update the check data as needed, trigger an alert if needed
// special logic for accomodating a check that has never been tested here before (don't alert on that one)
workers.processCheckOutcome = (checkData, checkOutcome) => {
  // Decide if the check is considered up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && checkData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Decide if an alert is warranted
  const alertWarranted = checkData.lastChecked && checkData.state !== state ? true : false;

  // Log the outcome
  const timeOfCheck = Date.now();
  workers.log(checkData, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update the check data
  let newCheckData = checkData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, err => {
    if(!err){
      // Send the new data to the next phase in the process if needed
      if(alertWarranted){
        workers.alertUserToStatusChange(newCheckData);
      }else{
        debug('Check outcome has not changed, no alert neeeded.');
      }
    }else{
      debug('Error: Could not save the updates to one of the checks.');
    }
  });
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (newCheckData) => {
  const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;

  helpers.sendTwilioSms(newCheckData.userPhone, msg, err => {
    if(!err){
      debug('Error: Could not send sms alert to user who had a state change in their checks.');
    }else{
      debug('Success: User was alerted to a status change in their check via sms: ', msg);
    }
  })
};

workers.log = (checkData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  // Form the log data
  const logData = {
    check: checkData,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck
  };

  // Convert to string
  const logString = JSON.stringify(logData);

  // Determine the name of the log file
  const logFilename = checkData.id;

  // Append the log string to the file
  _logs.append(logFilename, logString, err => {
    if(!err){
      debug('Logging to file succeded.');
    }else{
      debug('Logging to file failed.');
    }
  });
};

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = () => {
  // List all the (non compressed) log files
  _logs.list(false, (err, logs) => {
    if(!err && logs && logs.length > 0){
      logs.forEach( logName => {
        // Compress the data to a different file
        const logId = logName.replace('.log', '');
        const newFileId = `${logId}-${Date.now()}`;

        _logs.compress(logId, newFileId, err => {
          if(!err){
            // Truncate the log (empty the log file)
            _logs.truncate(logId, err => {
              if(!err){
                debug('Success truncating the file.');
              }else{
                debug('Error: could not truncate the file.');
              }
            });
          }else{
            debug('Error: Could not compress one of the log files', err);
          }
        });
      });
    }else{
      debug('Error: Could not find any logs to routate');
    }
  });
};

// timer to execute the log-rotation once per day
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

workers.init = () => {

  // Send to console,  in yellow
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
};

export default workers;