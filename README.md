# TorqueVAT dApp

A decentralised VAT refunds platform for TAX-free shopping on the [Algorand blockchain](https://github.com/algorand).

Application deployed on the Algorand TestNet.

## Requirements
- Nodejs
- npm
- Mongodb

## Installation

- Clone the repository
- Run `npm i --save` to download all the required libraries
- Run `npm run init_db_testnet` to setup the db
- Run `npm run server` to start the application

The application is accessible on `localhost:4060`.
 
There are 5 default users on startup such that:

| Username | Password | Role|
| ------------- | ------------- | ------------- |
| user@gmail.com  | asd  | USER |
| merchant@gmail.com  | asd  | MERCHANT |
| authority@gmail.com  | asd  | AUTHORITY |
| police@gmail.com  | asd  | POLICE |
| customs@gmail.com  | asd  | CUSTOMS |

### Roles Features

- USER 
    - Make payments to MERCHANTS
    - Buy VAT COINS
- MERCHANT
    - Recive payments
    - Providing the `vat-free payments` service
- AUTHORITY  
    - create and distribute `merchant identity tokens`
    - create and distribute `vat coins`
- POLICE 
    - create and distribute `tourists identity tokens`
- CUSTOMS
    - refound the vat of users


> **Credits:** @Linch01
