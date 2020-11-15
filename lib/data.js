/*
* Library for storing and editing data 
*/
const fs = require('fs');
const path = require('path');

const helpers = require(path.join(__dirname, 'helpers'));


let lib = {};

lib.baseDir = path.join(__dirname, '..', '.data');

lib.create = (dir, file, data, callback) => {
  fs.open(path.join(lib.baseDir, dir, `${file}.json`), 'wx', (err, fileDescriptor) => {
    if(!err && fileDescriptor){
      // convert data to string
      const stringData = JSON.stringify(data);

      //write to file and close it
      fs.writeFile(fileDescriptor, stringData, err => {
        if(!err){
          fs.close(fileDescriptor, err => {
            if(!err){
              callback(false);
            }else{
              callback(err); // Error closing new file
            }
          });
        }else{
          callback(err); // Error writing to new file
        }
      });
      
    }else{
      callback(err); // Could not create new file, it may already exist
    }
  });
};

lib.read = (dir, file, callback) => {
  fs.readFile(path.join(lib.baseDir, dir, `${file}.json`), 'utf-8', (err, data) => {
    if(!err && data){
      const parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    }else{
      callback(err, data);
    }
  });
};

lib.update = (dir, file, data, callback) => {
  fs.open(path.join(lib.baseDir, dir, `${file}.json`), 'r+', (err, fileDescriptor) => {
    if(!err && fileDescriptor){
      const stringData = JSON.stringify(data);

      // Truncate the file
      fs.ftruncate(fileDescriptor, err => {
        if(!err){
          // Write to the file and close it
          fs.writeFile(fileDescriptor, stringData, err => {
            if(!err){
              fs.close(fileDescriptor, err => {
                if(!err){
                  callback(false);
                }else{
                  callback(err); // Error closing file
                }
              });
            }else{
              callback(err); // Error wrinting to existing file
            }
          });
        }else{
          callback(err); // Error truncating file
        }
      });
    }else{
      callback(err); // Could not open the file for update, it may not exist yet
    }
  });
};

lib.delete = (dir, file, callback) => {
  fs.unlink(path.join(lib.baseDir, dir, `${file}.json`), err => {
    if(!err){
      callback(false);
    }else{
      callback(err); // Error deleting file
    }
  });
};


module.exports = lib;