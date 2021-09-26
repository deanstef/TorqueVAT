### Vat Refound App

The aim of this application is provide an automatic system using the [algorand blockchain](https://github.com/algorand) as an alternative to manage the vat payments of any tourist visiting any country.

### Setup

You can setup the evniroment, run the application and comunicate with the algorand testnet doing the following:

- Download this repository
- Open a terminal and `cd` inside this repository
- Install `mongodb`, `nodejs`, `npm`
- Run `npm i --save` to download all the required libraries
- Run `npm run init_db_testnet` to setup the db
- Run `npm run server` to start the application on `localhost:4060`

Now you should have the running application live on port 4060 of the localhost. 
By default 5 users with different roles are created, you can enter them with the following credentials.

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


> **Credits:**   @Linch01

