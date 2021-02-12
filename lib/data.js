/*
* Library for storing and editing data 
*/
import fs from 'fs';
import path from 'path';
import helpers from './helpers.js';
import { debuglog, formatWithOptions } from 'util';

// Setting debug name for the file
const debug = debuglog('data');


let lib = {};

lib.baseDir = path.join(path.resolve('lib'), '..', '.data');

lib.create = (dir, file, data, custom_res = {}) => {

  // Create dir if it does not exists
  if(!fs.existsSync(path.join(lib.baseDir, dir))){
    fs.mkdirSync(path.join(lib.baseDir, dir), {recursive: true});
  }

  return new Promise((resolve, reject) => {
    fs.open(path.join(lib.baseDir, dir, `${file}.json`), 'wx', (err, fileDescriptor) => {
    
      if(!err && fileDescriptor){
        // convert data to string
        const stringData = JSON.stringify(data);
  
        //write to file and close it
        fs.writeFile(fileDescriptor, stringData, err => {
          if(!err){
            fs.close(fileDescriptor, err => {
              if(!err){
                debug(formatWithOptions({colors: true}, 'Data: %O', data));
                resolve(data);
              }else{
                err.custom_res = custom_res;
                debug(formatWithOptions({colors: true}, 'Error: %O', err));
                reject(err); // Error closing new file
              }
            });
          }else{
            err.custom_res = custom_res;
            debug(formatWithOptions({colors: true}, 'Error: %O', err));
            reject(err); // Error writing to new file
          }
        });
      }else{
        err.custom_res = custom_res;
        debug(formatWithOptions({colors: true}, 'Error: %O', err));
        reject(err); // Could not create new file, it may already exist
      }
    });  
  });
};

lib.read = (dir, file, custom_res = {}) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(lib.baseDir, dir, `${file}.json`), 'utf-8', (err, data) => {
      if(!err && data){
        const parsedData = helpers.parseJsonToObject(data);
        debug(formatWithOptions({colors: true}, 'Data: %O', parsedData));
        resolve(parsedData);
      }else{
        err.custom_res = custom_res;
        debug(formatWithOptions({colors: true}, 'Error: %O', err));
        reject(err);
      }
    });
  });
};

lib.update = (dir, file, data, custom_res = {}) => {
  return new Promise((resolve, reject) => {
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
                    debug(formatWithOptions({colors: true}, 'Data: %O', data));
                    resolve(data);
                  }else{
                    err.custom_res = custom_res;
                    debug(formatWithOptions({colors: true}, 'Error: %O', err));
                    reject(err); // Error closing file
                  }
                });
              }else{
                err.custom_res = custom_res;
                debug(formatWithOptions({colors: true}, 'Error: %O', err));
                reject(err); // Error wrinting to existing file
              }
            });
          }else{
            err.custom_res = custom_res;
            debug(formatWithOptions({colors: true}, 'Error: %O', err));
            reject(err); // Error truncating file
          }
        });
      }else{
        err.custom_res = custom_res;
        debug(formatWithOptions({colors: true}, 'Error: %O', err));
        reject(err); // Could not open the file for update, it may not exist yet
      }
    });
  });
};

lib.delete = (dir, file,  custom_res = {}) => {
  const filePath =  path.join(lib.baseDir, dir, `${file}.json`);

  return new Promise((resolve, reject) => {
    if(fs.existsSync(filePath)){
      fs.unlink(filePath, err => {
        if(!err){
          resolve(true);
        }else{
          err.custom_res = custom_res;
          debug(formatWithOptions({colors: true}, 'Error: %O', err));
          reject(err); // Error deleting file
        }
      });
    }else{
      reject(new Error('File doesn\'t exist.'));
    }
  });
};

// List all the items in a directory
lib.list = (dir, custom_res = {}) => {
  return new Promise((resolve, reject) => {
    fs.readdir(path.join(lib.baseDir, dir), (err, data) => {
      if(!err && data && data.length > 0){
        let trimmedFilenames = [];
        data.forEach(filename => {
          trimmedFilenames.push(filename.replace('.json', ''));
        });
        debug(formatWithOptions({colors: true}, 'Data: %O', trimmedFilenames));
        resolve(trimmedFilenames);
      }else{
        err.custom_res = custom_res;
        debug(formatWithOptions({colors: true}, 'Error: %O', err));
        reject(err);
      }
    });
  });
};


export default lib;