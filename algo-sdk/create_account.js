require("dotenv").config();
const algosdk = require('algosdk');
var util= require('util');

function create_algo_address() {
    let _account = algosdk.generateAccount();
    let _passphrase = algosdk.secretKeyToMnemonic(_account.sk);
    return { address: _account.addr, mnemonic: _passphrase };
};


module.exports = create_algo_address;