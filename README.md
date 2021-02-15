# RESTful API using vanilla NodeJS
A complete HTTP/S webserver made with vanilla Node.js. 

## How to Install
1. Using your terminal: 
```sh
git clone git@github.com:RenanGalvao/restful-api.git
```

or download the zipped version from [master](https://github.com/RenanGalvao/restful-api/archive/master.zip).

2. Then, after unzipping, inside `https` directory run:
```sh
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pen -out cert.pen
```
3. Rename the `config_sample.js` file to `config.js` and modify the necessary fields.

## Basic Use
Start the app: `node index.js`.


### Actual Folder Structure
```
├── config.js
├── config_sample.js
├── https
│   ├── cert.pen
│   ├── key.pen
│   └── README.md
├── index.js
├── lib
│   ├── data.js
│   ├── handlers
│   │   ├── api
│   │   │   ├── checks.js
│   │   │   ├── login.js
│   │   │   ├── logout.js
│   │   │   └── users.js
│   │   ├── gui
│   │   │   ├── account.js
│   │   │   ├── checksGui.js
│   │   │   └── session.js
│   │   └── index.js
│   ├── helpers.js
│   ├── logs.js
│   ├── middlewares
│   │   ├── loadToken.js
│   │   └── verifyToken.js
│   ├── server.js
│   └── workers.js
├── LICENSE
├── package.json
├── public
│   ├── css
│   │   └── app.css
│   ├── favicon.ico
│   ├── images
│   │   ├── logo.png
│   │   └── rebellion to tyrants.jpeg
│   └── js
│       └── app.js
├── README.md
├── templates
│   ├── _footer.html
│   ├── _header.html
│   └── index.html
└── TODO
```


### Routes
```
All routes are accessible using GET method.

account/create -> create user
account/edit -> edit user
account/deleted -> after deleting user

session/create ->  create session
session/deleted -> after deleting session

checks/all -> list of all checks
checks/create -> create one more check
checks/edit -> edit checks
```

### API Routes
```
[GET] api/users -> user information.
[POST] api/users -> adds an user.
[PUT] api/users -> updates user information.
[DELETE] api/user/:phone -> removes the user.

[POST] api/login -> authenticates an user and returns the token.
[GET] api/logout -> log off by deleting the previously created token.

[GET] api/checks -> retrieve all checks from user.
[GET] api/checks/:check_id -> retrieve a specific check information.
[POST] api/checks  -> adds a check for the user.
[PUT] api/checks/:check_id -> updates the check.
[DELETE] api/checks/:check_id  -> removes the check.
```
All routes check the data sent and inform which fields should be sent when required.

### Debug
Several files have a debug option that can be actived starting the app with the enviroment var `NODE_DEBUG` and their respective values:
```sh
lib/data.js -> data
lib/helpers.js -> helpers
lib/server.js -> server
lib/workers.js -> workers

lib/handlers/index.js -> handlers

lib/handlers/api/checks.js -> checks
lib/handlers/api/login.js -> login
lib/handlers/api/logout.js -> logout
lib/handlers/api/users.js -> users

lib/handlers/gui/account.js -> account
lib/handlers/gui/checksGui.js -> checks-gui
lib/handlers/gui/session.js -> session
```