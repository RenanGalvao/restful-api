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
          resolve([status, {err: 'Internal', message: 'We\'re working on it :)'}]);
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
  if(!document.querySelector('form')){
    return;
  }

  // Accept more than one form per page
  const allForms = document.querySelectorAll('form');
  allForms.forEach( form => {
    form.addEventListener('submit', async function(e){

      // Stop it from submitting
      e.preventDefault();
      const formId = this.id;
      const path = this.action;
      const method = this.getAttribute('method').toUpperCase();
  
      // Hide the error message (if it's currently shown due to a previous error)
      document.querySelector(`#${formId} .formError`).style.display = 'hidden';

      // Hide the success message (if it's currently shown due to a previous error)
      if(document.querySelector(`#${formId} .formSuccess`)){
        document.querySelector(`#${formId} .formSuccess`).style.display = 'none';
      }
  
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
      if(statusCode !== 201 && statusCode !== 200){
  
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
  }); 
};

// Form response processor
app.formResponseProcessor = async function(formId, requestPayload, responsePayload){
  let functionToCall = false;

  /*
  * Account Create
  * If account creation was successful, try to immediately log the user in
  */
  if(formId == 'accountCreate'){
    // Take the phone and password, and use it to log the user in
    const newPayload = {
      'phone' : requestPayload.phone,
      'password' : requestPayload.password
    };

    const options = {
      headers: {
        'Content-Type': 'application/json',
      },
      path: '/api/login',
      method: 'POST',
    };
    const [statusCode, response] = await app.client.request(options, newPayload);
    
    // Display an error on the form if needed
    if(statusCode !== 200){

      // Try to get the error from the api, or set a default error message
      const error = response.message || 'An error has occured, please try again';

      // Set the formError field with the error text
      document.querySelector(`#${formId} .formError`).innerHTML = error;

      // Show (unhide) the form error field on the form
      document.querySelector(`#${formId} .formError`).style.display = 'block';

    } else {
      // If successful, set the token and redirect the user
      app.setSessionToken(response);
      window.location = '/checks/all';
    }
  }

  /*
  * Account Edit
  * If forms saved successfully and they have success messages, show them
  */
  const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2'];
  if(formsWithSuccessMessages.includes(formId)){
    document.querySelector(`#${formId} .formSuccess`).style.display = 'block';
  }

  /*
  * Session
  * If login was successful, set the token in localstorage and redirect the user
  */
  if(formId == 'sessionCreate'){
    app.setSessionToken(responsePayload);
    window.location = '/checks/all';
  }
};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = function(){
  const tokenString = localStorage.getItem('token');
  if(typeof tokenString  == 'string'){
    try{
      const token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if(typeof token  == 'object'){
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    }catch(e){
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = function(token){
  app.config.sessionToken = token;
  const tokenString = JSON.stringify(token);
  localStorage.setItem('token',tokenString);
  if(typeof token == 'object'){
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function(add){
  var target = document.querySelector("body");
  if(add){
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};

app.logUserOut = async () => {
  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
    path: '/api/logout',
    method: 'GET',
  };
  const [statusCode, response] = await app.client.request(options, {});
  console.log(statusCode)
  if(statusCode == 204){
     // Set the app.config token as false
     app.setSessionToken(false);

     // Send the user to the logged out page
     window.location = '/session/deleted';
  }
};

app.bindLogoutButton = () => {
  document.getElementById("logoutButton").addEventListener("click", function(e){

    // Stop it from redirecting anywhere
    e.preventDefault();

    // Log the user out
    app.logUserOut();

  });
};

// Load data on the page
app.loadDataOnPage = () => {
  // Get the current page from the body class
  const bodyClasses = document.querySelector("body").classList;
  const primaryClass = typeof bodyClasses[0]  == 'string' ? bodyClasses[0] : false;

  // Logic for account settings page
  if(primaryClass == 'accountEdit'){
    app.loadAccountEditPage();
  }
};

// Load the account edit page specifically
app.loadAccountEditPage = async () => {
  // Get the phone number from the GET /api/users, or log the user out if none is there
  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
    path: '/api/users',
    method: 'GET',
  };
  const [statusCode, response] = await app.client.request(options, {});

  if(statusCode == 200 && response.phone){
    // Put the data into the forms as values where needed
    document.querySelector("#accountEdit1 .firstNameInput").value = response.firstName;
    document.querySelector("#accountEdit1 .lastNameInput").value = response.lastName;
    document.querySelector("#accountEdit1 .displayPhoneInput").value = response.phone;

    // Put the hidden phone field into both forms
    const hiddenPhoneInputs = document.querySelectorAll("input.hiddenPhoneNumberInput");
    hiddenPhoneInputs.forEach(input => {
      input.value = response.phone;
    });
  } 

  // Something went wrong
  else {
    app.logUserOut();
  }
};

// Init (bootstrapping)
app.init = function(){

  // Bind all form submissions
  app.bindForms();

  // Logout
  app.bindLogoutButton();

  // Get the token from localstorage
  app.getSessionToken();

  // Load data on page
  app.loadDataOnPage();
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