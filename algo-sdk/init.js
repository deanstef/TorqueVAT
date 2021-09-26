require("dotenv").config();
const algosdk = require('algosdk');
var util= require('util');
var enc = new util.TextEncoder();
var accounts = require('./accounts');

const algodToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const algodServer = "http://localhost";
const algodPort = 4001;

let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
let address = accounts[0].address;
let account = accounts[0].account;

// Function used to wait for a tx confirmation
const waitForConfirmation = async function (algodclient, txId) {
    let response = await algodclient.status().do();
    let lastround = response["last-round"];
    while (true) {
        const pendingInfo = await algodclient.pendingTransactionInformation(txId).do();
        if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
            //Got the completed Transaction
            console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"]);
            break;
        }
        lastround++;
        await algodclient.statusAfterBlock(lastround).do();
    }
};

function generateAlgorandKeyPair() {
    let _account = algosdk.generateAccount();
    let _passphrase = algosdk.secretKeyToMnemonic(account.sk);
    console.log( "My address: " + _account.addr );
    console.log( "My passphrase: " + _passphrase );
};

async function create_id_asset(){
    let note = undefined; // arbitrary data to be stored in the transaction; here, none is stored
    
    // Whether user accounts will need to be unfrozen before transacting    
    let defaultFrozen = true;
    // integer number of decimals for asset unit calculation
    let decimals = 0;
    // total number of this asset available for circulation   
    let totalIssuance = 1;
    // Used to display asset units to user    
    let unitName = "ID_TOKEN";
    // Friendly name of the asset    
    let assetName = "ID_TOKEN";
    // Optional string pointing to a URL relating to the asset
    let assetURL = "http://google.com";
    // Optional hash commitment of some sort relating to the asset. 96 character length.
    let assetMetadataHash = "16efaa3924a6fd9d3a4824799a4ac65d"; // -> hash of the user passportId-name-surname.
    // The following parameters are the only ones
    // that can be changed, and they have to be changed
    // by the current manager
    // Specified address can change reserve, freeze, clawback, and manager
    let manager = address;
    // Specified address is considered the asset reserve
    // (it has no special privileges, this is only informational)
    let reserve = address;
    // Specified address can freeze or unfreeze user asset holdings 
    let freeze = address;
    // Specified address can revoke user asset holdings and send 
    // them to other addresses    
    let clawback = address;

    // suggested params
    let params = await algodClient.getTransactionParams().do();
    params.fee = 1000;
    // signing and sending "txn" allows "addr" to create an asset
    let txn = algosdk.makeAssetCreateTxnWithSuggestedParams(address, note,
            totalIssuance, decimals, defaultFrozen, manager, reserve, freeze,
        clawback, unitName, assetName, assetURL, assetMetadataHash, params);

    console.log("SENT ASSET CREATION TX");


    let rawSignedTxn = txn.signTxn(account.sk)

    console.log("SIGNED ASSET CREATION TX");

    let tx = await algodClient.sendRawTransaction(rawSignedTxn).do();
    console.log("Transaction : " + tx.txId);

    let assetID = null;
    // wait for transaction to be confirmed
    console.log("WAITING ASSET CREATION TX");
    await waitForConfirmation(algodClient, tx.txId);


    // Get the new asset's information from the creator account
    let ptx = await algodClient.pendingTransactionInformation(tx.txId).do();
    assetID = ptx["asset-index"];
    console.log(`CREATED ASSET: ${assetID}`);
    return assetID;
}

async function get_account_info(){
    return await algodClient.accountInformation(address).do();
}

( async () => {

    let status = (await algodClient.status().do());
    console.log("Algorand network status: %o", status);

    let params = await algodClient.getTransactionParams().do();
    console.log("Algorand suggested parameters: %o", params);

    console.log( await get_account_info() );

    // generateAlgorandKeyPair();

    await create_asset();

})()