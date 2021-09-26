require('dotenv').config();
const algosdk = require('algosdk')
const accounts = {};
const mongoose = require('mongoose');
const User = require('../server/models/user');
const Asset = require('../server/models/algo-asset');
const faker = require('faker');
var configDB = require('../config/database.js');
var create_algo_address = require('../algo-sdk/create_account');
var child_process = require('child_process');

mongoose.connect( configDB.url, {useNewUrlParser: true, useUnifiedTopology: true});

async function generate_test_accounts(){
    let users_to_generate = { 
        "POLICE": "police@gmail.com", 
        "AUTHORITY":"authority@gmail.com" , 
        "USER": "user@gmail.com", 
        "MERCHANT": "merchant@gmail.com", 
        "CUSTOMS": "customs@gmail.com" 
    };
    let assets_to_generate = ["TOURIST", "MERCHANT", "VAT"];
    
    for( let name in users_to_generate ){
        let email = users_to_generate[name];
        let algo_account;
        let algo_address;
        let algo_memo;
        if( !process.env[`${name}_ADD`] ){
            algo_account = create_algo_address();
            algo_address = algo_account.address;
            algo_memo = algo_account.mnemonic;
            console.log( `NEW ADDRESS: ${algo_address}` );
            console.log( `NEW MNEMONIC: ${algo_memo}` );
        } else {
            algo_address = process.env[`${name}_ADD`];
            algo_memo = process.env[`${name}_MEMO`];
        }
         

        let fields = {
            name: faker.name.firstName(),
            surname: faker.name.lastName(),
            email: email,
            passaport_id: faker.datatype.number( 10 ),

            algo_address: algo_address,
            algo_mnemonic: algo_memo
        };
        fields['role'] = name;

        let user = new User( fields );
        user.password = user.generateHash("asd");
        await user.save();
        console.log(`created. ${email} | ${algo_address}`);
        
    }

    console.log("-- ALL ACCOUNTS CREATED --\n\n");
    
    for ( let asset_name of assets_to_generate ) {
        let asset = new Asset( {
            id: process.env[`ASSET_${asset_name}`],
            type: `ASSET_${asset_name}`
        } );
        console.log(`created. ASSET_${asset_name}`);
        await asset.save();
    }

    console.log("-- ALL ASSETS CREATED --\n\n");

    process.exit();
}

( async () => {
    await generate_test_accounts();
} )();
