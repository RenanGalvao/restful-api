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

#### Create an account
Send a `POST` request as JSON to `http://localhost:3000/users`:
```JSON
{
	"name": "T. Hanks",
	"email": "thanks@example.com",
	"password": "123",
	"street_address": "123 Nowhere"
}
```

#### Log-in
Send a `POST` request as JSON to `http://localhost:3000/login`:
```JSON
{
	"name": "T. Hanks",
	"email": "thanks@example.com",
	"password": "123",
	"street_address": "123 Nowhere"
}
```

Response (something like this):
```JSON
{
  "email": "thanks@example.com",
  "token_id": "184wwpxy4p49ajoy1elb",
  "expires": 1612480954036,
  "name": "T. Hanks",
  "stripe_customer_id": "cus_It2CBjF49O05v2"
}
```
Save the token_id for later use as a bearer token in all subsequent requests that you need to authenticate.

#### Register a card
Send a `POST` request as JSON to `http://localhost:3000/card`:
```JSON
{
	"stripe_token": "tok_visa"
}
```

#### Add some items to the cart
Send a `POST` request as JSON to `http://localhost:3000/cart`:
```JSON
{
	"item_id": "1g2a2fp4o1hw943cn7tw",
	"quantity": 3
}
```
Response (something like this):
```JSON
{
  "items": [
    {
      "item_id": "1g2a2fp4o1hw943cn7tw",
      "quantity": 3
    }
  ]
}
```
You can look at the item ids in the menu route.

#### Place an order
Send a `POST` request to `http://localhost:3000/order`. Response (something like this):
```JSON
{
  "id": "ch_1IHGjDBxFSNMzSeaY7lrP1yk",
  "object": "charge",
  "amount": 6600,
  ...
}
```


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
