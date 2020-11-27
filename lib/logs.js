const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};

lib.baseDir = path.join(__dirname, '..', '.logs');

// Append a string to a file. Create the file if it does not exist.
lib.append = (filename, string, callback) => {
  // Opening the file for append
  fs.open(path.join(lib.baseDir, `${filename}.log`), 'a', (err, fileDescriptor) =>{
    if(!err && fileDescriptor){
      // Append to the file and close it
      fs.appendFile(fileDescriptor, `${string}\n`, err => {
        if(!err){
          fs.close(fileDescriptor, err => {
            if(!err){
              callback(false);
            }else{
              callback('Error closing file that was being appended.');
            }
          });
        }else{  
          callback('Error appending the file.');
        }
      });
    }else{
      callback('Could not open file for appending.');
    }
  });
};

// List all the logs and optionally include all the compressed logs
lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if(!err && data && data.length > 0){
      let trimmedFilenames = [];

      data.forEach( filename => {
        // Add the .log files
        if(filename.indexOf('.log') > -1 && filename != '.keep'){
          trimmedFilenames.push(filename.replace('.log', ''));
        }

        // Add on the .gz files 
        if(includeCompressedLogs && filename.indexOf('.gz.b64') > -1 && filename != '.keep'){
          trimmedFilenames.push(filename.replace('.gz.b64', ''));
        }
      });

      callback(false, trimmedFilenames);
    }else{
      callback(err, data);
    }
  });
};

// Compress the content of one .log file into a .gz.b64 file within the same directory
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destFile = `${newFileId}.gz.b64`;

  fs.readFile(path.join(lib.baseDir, sourceFile), 'utf-8', (err, inputString) => {
    if(!err && inputString){
      // Compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if(!err && buffer){
          // Send the data to the destination file
          fs.open(path.join(lib.baseDir, destFile), 'wx', (err, fileDescriptor) =>{
            if(!err && fileDescriptor){
              // Write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                if(!err){
                  // Close the destination file
                  fs.close(fileDescriptor, err => {
                    if(!err){
                      callback(false);
                    }else{
                      callback(err);
                    }
                  });
                }else{
                  callback(err);
                }
              });
            }else{
              callback(err);
            }
          });
        }else{
          callback(err);
        }
      });
    }else{
      callback(err);
    }
  });
};

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = (fileId, callback) => {
  const filename = `${fileId}.gz.b64`;
  
  fs.readFile(path.join(lib.baseDir, filename), (err, string) => {
    if(!err && string){
      // Decompress the data
      const inputBuffer = Buffer.from(string, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if(!err && outputBuffer){
          // Callback
          const str = outputBuffer.toString();
          callback(false, str);
        }else{
          callback(err);
        }
      });
    }else{
      callback(err);
    }
  });
};

// Truncate a log file
lib.truncate = (logId, callback) => {
  fs.truncate(path.join(lib.baseDir, `${logId}.log`), err => {
    if(!err){
      callback(false);
    }else{ 
      callback(err);
    }
  });
};

module.exports = lib;