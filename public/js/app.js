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
  xhr.open(options.method, `${options.path}${typeof options.slugs != 'object' ? stringify(options.queryString) : `/${options.slugs.join('/')}`}`, true);
  for(const header in options.headers){
    xhr.setRequestHeader(header, options.headers[header]);
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
      let method = this.getAttribute('method').toUpperCase();
  
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
          // Determine class of element and set value accordingly
          const classOfElement = typeof elements[i].classList.value == 'string' && elements[i].classList.value.length > 0 ? elements[i].classList.value : '';
          const valueOfElement = elements[i].type == 'checkbox' && !classOfElement.includes('multiselect') ? elements[i].checked : !classOfElement.includes('intval') ? elements[i].value : parseInt(elements[i].value);
          const elementIsChecked = elements[i].checked;
          // Override the method of the form if the input's name is _method
          let nameOfElement = elements[i].name;
          if(nameOfElement == '_method'){
            method = valueOfElement;
          } else {
            // Create an payload field named "method" if the elements name is actually httpmethod
            if(nameOfElement == 'httpmethod'){
              nameOfElement = 'method';
            }
            // If the element has the class "multiselect" add its value(s) as array elements
            if(classOfElement.includes('multiselect')){
              if(elementIsChecked){
                payload[nameOfElement] = typeof payload[nameOfElement] == 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                payload[nameOfElement].push(valueOfElement);
              }
            } else {
              payload[nameOfElement] = valueOfElement;
            }
          }
        }
      }

      // If the method is DELETE or PUT, use the slug to pass the phone
      let slugs = [];
      if(method == 'DELETE'){
        for(const key in payload){
          slugs.push(payload[key]);
        }
      }else if(method == 'PUT'){
        for(const key in payload){
          if(key == 'uid'){
            slugs.push(payload[key]);
          }
        }
      }
  
      // Call the API
      const options = {
        headers: {
          'Content-Type': 'application/json',
        },
        path,
        method,
        slugs,
      };
      const [statusCode, response] = await app.client.request(options, payload); 
      
      // Display an error on the form if needed
      if(![200, 201, 204].includes(statusCode)){
  
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
  const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2', 'checksEdit1'];
  if(formsWithSuccessMessages.includes(formId)){
    document.querySelector(`#${formId} .formSuccess`).style.display = 'block';
  }

  /*
  * Account Deleted
  * If the user just deleted their account, redirect them to the account-delete page
  */
  if(formId == 'accountEdit3'){
    app.logUserOut(false);
    window.location = '/account/deleted';
  }

  /*
  * Session
  * If login was successful, set the token in localstorage and redirect the user
  */
  if(formId == 'sessionCreate'){
    app.setSessionToken(responsePayload);
    window.location = '/checks/all';
  }


  /*
  * Checks 
  * If the user just created a new check successfully, redirect back to the dashboard
  */
  if(formId == 'checksCreate'){
    window.location = '/checks/all';
  }

  // If the user just deleted a check, redirect them to the dashboard
  if(formId == 'checksEdit2'){
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

  // Logic for dashboard page
  if(primaryClass == 'checksList'){
    app.loadChecksListPage();
  }

  // Logic for check details page
  if(primaryClass == 'checksEdit'){
    app.loadChecksEditPage();
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

// Load the dashboard page specifically
app.loadChecksListPage = async () => {
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
    // Determine how many checks the user has
    const allChecks = typeof response.checks == 'object' && response.checks instanceof Array && response.checks.length > 0 ? response.checks : [];
    if(allChecks.length > 0){

      // Show each created check as a new row in the table
      allChecks.forEach( async checkId => {
        // Get the data for the check
        const newOptions = {
          headers: {
            'Content-Type': 'application/json',
          },
          path: '/api/checks',
          method: 'GET',
          slugs: [checkId],
        };
        const [newStatusCode, newResponse] = await app.client.request(newOptions, {});

        if(newStatusCode == 200 ){
          const checkData = newResponse;

          // Make the check data into a table row
          const table = document.getElementById("checksListTable");
          const tr = table.insertRow(-1);
          tr.classList.add('checkRow');
          const td0 = tr.insertCell(0);
          const td1 = tr.insertCell(1);
          const td2 = tr.insertCell(2);
          const td3 = tr.insertCell(3);
          const td4 = tr.insertCell(4);
          td0.innerHTML = newResponse.method.toUpperCase();
          td1.innerHTML = newResponse.protocol+'://';
          td2.innerHTML = newResponse.url;
          const state = typeof(newResponse.state) == 'string' ? newResponse.state : 'unknown';
          td3.innerHTML = state;
          td4.innerHTML = `<a href="/checks/edit/${newResponse.id}">View / Edit / Delete</a>`;
        }else {
          console.log(`Error trying to load check ID: ${checkId}`);
        }
      });

      if(allChecks.length < 5){
        // Show the createCheck CTA
        document.getElementById("createCheckCTA").style.display = 'block';
      }

    } else {
      // Show 'you have no checks' message
      document.getElementById("noChecksMessage").style.display = 'table-row';

      // Show the createCheck CTA
      document.getElementById("createCheckCTA").style.display = 'block';

    }
  }

  // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
  else {
    app.logUserOut();
  }
};

// Load the checks edit page specifically
app.loadChecksEditPage = async () => {

  // Get the check id from the href, if none is found then redirect back to dashboard
  // eg.: http://domain.com/checks/edit/:id
  const lastSlashIndex = window.location.href.lastIndexOf('/');
  const tmpId = window.location.href.substring(lastSlashIndex + 1);
  const id = typeof tmpId == 'string' && tmpId.length > 0 ? tmpId : false;
  
  if(!id){
    window.location = '/checks/all';
  }
    
  // Fetch the check data
  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
    path: `/api/checks/${id}`,
    method: 'GET',
  };
  const [statusCode, response] = await app.client.request(options, {});

  if(statusCode == 200){
    // Put the hidden id field into both forms
    const hiddenIdInputs = document.querySelectorAll("input.hiddenIdInput");
    for(let i = 0; i < hiddenIdInputs.length; i++){
      hiddenIdInputs[i].value = response.id;
    }

    // Put the data into the top form as values where needed
    document.querySelector("#checksEdit1 .displayIdInput").value = response.id;
    document.querySelector("#checksEdit1 .displayStateInput").value = response.state;
    document.querySelector("#checksEdit1 .protocolInput").value = response.protocol;
    document.querySelector("#checksEdit1 .urlInput").value = response.url;
    document.querySelector("#checksEdit1 .methodInput").value = response.method;
    document.querySelector("#checksEdit1 .timeoutInput").value = response.timeoutSeconds;
    const successCodeCheckboxes = document.querySelectorAll("#checksEdit1 input.successCodesInput");
    for(let i = 0; i < successCodeCheckboxes.length; i++){
      if(response.successCodes.includes(parseInt(successCodeCheckboxes[i].value))){
        successCodeCheckboxes[i].checked = true;
      }
    }
  }else{
    // If the request comes back as something other than 200, redirect back to dashboard
    window.location = '/checks/all';
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
  slugs: [],
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