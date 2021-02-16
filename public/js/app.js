/*
* Front-End Logic
*/

const app = {};

// Config
app.config = {
  sessionToken: false,
};

// AJAX Client (For the RESTful API)
app.client = {};

// Interface for making API calls
app.client.request = (options = app.client.request._optionsDefault, payload = {}) => {

  const xhr = new XMLHttpRequest();
  xhr.open(options.method, `${options.path}${stringify(options.queryString)}`, true);
  for(const header in options.headers){
    xhr.setRequestHeader(header, options.headers[header]);
  }

  // If theres a current session token set, add that as a header
  if(app.config.sessionToken){
    xhr.setRequestHeader('Bearer', app.config.sessionToken.id);
  }

  // handle response
  return new Promise((resolve, reject) => {
    xhr.onreadystatechange = () => {
      if(xhr.readyState == XMLHttpRequest.DONE){
        const status = xhr.status;
        const res = xhr.responseText;

        try{
          resolve([status, JSON.parse(res)]);
        }catch(err){
          console.log(err);
          reject([status, {err: 'Internal', message: 'We\'re working on it :)'}]);
        }
      }
    };

    // Send payload
    const payloadString = JSON.stringify(payload);
    xhr.send(payloadString);
  });
};

// Bind the forms
app.bindForms = function(){
  document.getElementById('accountCreate').addEventListener('submit', async function(e){

    // Stop it from submitting
    e.preventDefault();
    const formId = this.id;
    const path = this.action;
    const method = this.method.toUpperCase();

    // Hide the error message (if it's currently shown due to a previous error)
    document.querySelector(`#${formId} .formError`).style.display = 'hidden';

    // Turn the inputs into a payload
    const payload = {};
    const elements = this.elements;
    for(let i = 0; i < elements.length; i++){
      if(elements[i].type !== 'submit'){
        const valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
        payload[elements[i].name] = valueOfElement;
      }
    }

    // Call the API
    const options = {
      headers: {
        'Content-Type': 'application/json',
      },
      path,
      method,
    };
    const [statusCode, response] = await app.client.request(options, payload); 
    
    // Display an error on the form if needed
    if(statusCode !== 201){

      // Try to get the error from the api, or set a default error message
      const error = response.message || 'An error has occured, please try again';

      // Set the formError field with the error text
      document.querySelector(`#${formId} .formError`).innerHTML = error;

      // Show (unhide) the form error field on the form
      document.querySelector(`#${formId} .formError`).style.display = 'block';

    } else {
      // If successful, send to form response processor
      app.formResponseProcessor(formId, payload, response);
    }
  });
};

// Form response processor
app.formResponseProcessor = function(formId, requestPayload, responsePayload){
  const functionToCall = false;
  if(formId == 'accountCreate'){
    // @TODO Do something here now that the account has been created successfully
    alert(responsePayload);
  }
};

// Init (bootstrapping)
app.init = function(){
  // Bind all form submissions
  app.bindForms();
};

// Call the init processes after the window loads
window.onload = function(){
  app.init();
};


// Defaults for app.client.request
app.client.request._optionsDefault = {
  headers: {
    'Content-Type': 'application/json',
  },
  queryString: '',
  path: '/ping', 
  method: 'GET',
};

// Stringify objects as key=value&key2=value2
function stringify(obj) {
  let str = '';
  for(const key in obj){
    str += `${str.length > 0 ? '&' : '?'}${key}=${obj[key]}`;
  }
  return str;
}