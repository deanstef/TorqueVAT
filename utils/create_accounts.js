require('dotenv').config();
const algosdk = require('algosdk')
const accounts = {};
const mongoose = require('mongoose');
const User = require('../server/models/user');
const faker = require('faker');
var configDB = require('../config/database.js');
var create_algo_address = require('../algo-sdk/create_account');
var child_process = require('child_process');

mongoose.connect( configDB.url, {useNewUrlParser: true, useUnifiedTopology: true});

async function generate_test_accounts(){
    let to_generate = { 
        "POLICE": "police@gmail.com", 
        "AUTHORITY":"authority@gmail.com" , 
        "USER": "user@gmail.com", 
        "MERCHANT": "merchant@gmail.com", 
        "CUSTOMS": "customs@gmail.com" 
    };
    
    for( let name in to_generate ){
        console.log( name )
        let email = to_generate[name];
        let algo_acount = create_algo_address();
        let algo_address = algo_acount.address;

        let fields = {
            name: faker.name.firstName(),
            surname: faker.name.lastName(),
            email: email,
            passaport_id: faker.datatype.number( 10 ),

            algo_address: algo_address,
            algo_mnemonic: algo_acount.mnemonic
        };
        fields['role'] = name;

        let user = new User( fields );
        user.password = user.generateHash("asd");
        await user.save();
        console.log("created. ", email);
       

        console.log("transferring token to the account " + algo_address);
        console.log("Mnemonic: ", algo_acount.mnemonic );
        let sandbox_default_add = process.env.SANDBOX_DEFAULT_ADDRESS;
        child_process.execFileSync('docker', `exec -it algorand-sandbox-algod goal clerk send -f ${sandbox_default_add} -t ${algo_address} --fee 1000 -a 1000000`.split(" "), {stdio: 'inherit'})
        console.log("Done\n\n");
        
    }
    process.exit();
}

( async () => {
    await generate_test_accounts();
} )();
