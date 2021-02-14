# RESTful API using vanilla NodeJS
Course from pirple.com

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


## This below needs to be updated
## API Routes
```
[GET] /card -> user card information.
[POST] /card -> adds a credit card for future payments.
[PUT] /card -> updates some cardholder information.
[DELETE] /card -> removes the card as a form of payment.

[GET] /cart -> user cart information.
[POST] /cart -> adds an item to the user's cart.
[PUT] /cart/:item_id -> updates the number of items for a given item
[DELETE] /cart/:item_id -> removes an item from the cart.

[GET] /menu -> all menu items or specifics through filters.
[POST] /menu -> adds an item to the menu.
[PUT] /menu/:item_id -> updates a specific item.
[DELETE] /menu/:item_id -> removes an item from the menu.

[POST] /login -> authenticates a user and returns a token.
[GET] /logout -> log off by deleting the previously created token.

[GET] /user -> user information.
[POST] /user -> adds an user.
[PUT] /user -> updates user information.
[DELETE] /user/:email -> removes the user.
```
All routes check the data sent and inform which fields should be sent when required.

## Debug
Several files have a debug option that can be actived starting the app with the enviroment var `NODE_DEBUG` and their respective values:
```sh
data.js -> data
errorHandler.js -> errors
helpers.js -> helpers
server.js -> server
lib/handlers/card.js -> card
lib/handlers/cart.js -> cart
lib/handlers/index.js -> handlers
lib/handlers/menu.js -> menu
lib/handlers/order.js -> order
lib/handlers/tokens.js -> tokens
lib/handlers/users.js -> users
```
