/*
* Workers
* Do the uptime check
*/
import http from 'http';
import https from 'https';
import url from 'url';
import _data from './data.js';
import _logs from './logs.js';
import { sendTwilioSms, validate } from './helpers.js';
import { debuglog, formatWithOptions } from 'util';

const debug = debuglog('workers');

// Workers module object
let workers = {};

// Lookup all checks, get their data,  send to a validator
workers.gatherAllChecks = async () => {
  // Get all the checks
  try{
    const checks = await _data.list('checks');
    for(const check of checks){
      try{
        const checkData = await _data.read('checks', check);
        workers.validateCheckData(checkData);
      }catch{
        debug(formatWithOptions({colors: true}, '[WORKERS] Error: Could not read one of the check\'s data.'));
      }
    }
  }catch{
    debug(formatWithOptions({colors: true}, '[WORKERS] Error: Could not find any checks to process.'));
  }
};

workers.validateCheckData = (checkData) => {
  debug(formatWithOptions({colors: true}, '[WORKERS][VALIDATE_CHECKDATA] CheckData: %O', checkData));

  // Validate
  const id = validate(checkData.id, 'token', {equal: workers._tokenLength});
  const phone = validate(checkData.phone, 'string', {equal: workers._phoneLength});
  const protocol = validate(checkData.protocol, 'enum', {enumArr: workers._protocols});
  const url = validate(checkData.url, 'string');
  const method = validate(checkData.method, 'enum', {enumArr: workers._methods});
  const successCodes = validate(checkData.successCodes, 'array');
  const timeoutSeconds = validate(checkData.timeoutSeconds, 'number', {integer: true, min: 1, max: 5});
  debug(formatWithOptions({colors: true}, '[WORKERS][VALIDATE_CHECKDATA] Validate: %O', {id, phone, protocol, url, method, successCodes, timeoutSeconds}));

  // Set the keys that may not be set (if the workers have never seen this check before)
  const state = typeof checkData.state == 'string' && workers._states.includes(checkData.state) ? checkData.state : 'down';
  const lastChecked = validate(checkData.lastChecked, 'number', {min: 1});
  debug(formatWithOptions({colors: true}, '[WORKERS][VALIDATE_CHECKDATA] State: %O\nLast Checked: %O', {state, lastChecked}));

  // If all the checks pass, pass the data along to the next step in the process
  if(id && phone && protocol && url && method && successCodes && timeoutSeconds){
    workers.performCheck({id, phone, protocol, url, method, successCodes, timeoutSeconds, state, lastChecked});
  }else{
    debug(formatWithOptions({colors: true}, '[WORKERS][VALIDATE_CHECKDATA] Error: one of the checks is not properly formatted. Skipping it.'));
  }
};

workers._tokenLength = 20;
workers._phoneLength = 11;
workers._protocols = ['https', 'http'];
workers._methods = ['get', 'post', 'put', 'delete'];
workers._states = ['up', 'down'];


// Perform the check, send the checkData and the outcome of the check process, to the next step
workers.performCheck = (checkData) => {
  debug(formatWithOptions({colors: true}, '[WORKERS][PERFORM_CHECK] CheckData: %O', checkData));
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
  debug(formatWithOptions({colors: true}, '[WORKERS][PERFORM_CHECK] Request Details: %O', requestDetails));

  // Instantiate the request object
  const _moduleToUse = checkData.protocol == 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, res => {
    // Grab the status of the sent request
    const status = res.statusCode;
    debug(formatWithOptions({colors: true}, '[WORKERS][PERFORM_CHECK] Response Status: %O', status));

    // Update the checkOutcome and pass data along
    checkOutcome.responseCode = status;
    if(!outcomeSent){
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', e => {
    debug(formatWithOptions({colors: true}, '[WORKERS][PERFORM_CHECK] Request Error: %O', e));

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
    debug(formatWithOptions({colors: true}, '[WORKERS][PERFORM_CHECK] Request Error: %O', e));

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
workers.processCheckOutcome = async (checkData, checkOutcome) => {
  debug(formatWithOptions({colors: true}, '[WORKERS][PROCESS_CHECK_OUTCOME] Check Data: %O\nCheck Outcome: O%', checkData, checkOutcome));

  // Decide if the check is considered up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && checkData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';

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
  try{
    await _data.update('checks', newCheckData.id, newCheckData);
    if(alertWarranted){
      workers.alertUserToStatusChange(newCheckData);
    }else{
      debug(formatWithOptions({colors: true}, '[WORKERS][PROCESS_CHECK_OUTCOME] Check outcome has not changed, no alert neeeded.'));
    }  
  }catch{
    debug(formatWithOptions({colors: true}, '[WORKERS][PROCESS_CHECK_OUTCOME] Error: Could not save the updates to one of the checks.'));
  }
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (newCheckData) => {
  debug(formatWithOptions({colors: true}, '[WORKERS][ALERT_USER] New Check Data: %O.', newCheckData));
  const msg = `Alert: Your check for [${newCheckData.method.toUpperCase()}] ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;

  sendTwilioSms(newCheckData.phone, msg, err => {
    if(!err){
      debug(formatWithOptions({colors: true}, '[WORKERS][ALERT_USER] Error: Could not send sms alert to user who had a state change in their checks.'));
    }else{
      debug(formatWithOptions({colors: true}, '[WORKERS][ALERT_USER] Success: User was alerted to a status change in their check via sms: %O', msg));
    }
  })
};

workers.log = (checkData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  debug(formatWithOptions({colors: true}, 
    '[WORKERS][LOG]: Check Data: %O\n Check Outcome: %O\n State: %O\n Alert Warranted: %O\n Time of Check: %O',
    checkData, checkOutcome, state, alertWarranted, timeOfCheck));

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
      debug(formatWithOptions({colors: true}, '[WORKERS][LOG] Success: Logging to file succeded.'));
    }else{
      debug(formatWithOptions({colors: true}, '[WORKERS][LOG] Error: Logging to file failed.'));
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