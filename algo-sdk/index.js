require("dotenv").config();
const algosdk = require('algosdk');
var { TextEncoder  } = require('util'); 
const path = require('path');
const fs = require('fs');

// ALGORAND PRIVATE NETWORK CONNECTION ON SANDBOX
// const algodToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
// const algodServer = "http://localhost";
// const algodPort = 4001;
// let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

// ALGORAND TESTNET PURESTAKE 
const algodToken = {
    "x-api-key": process.env.API_KEY 
};
let algodClient = new algosdk.Algodv2(algodToken, "https://testnet-algorand.api.purestake.io/ps2", "");
let indexerClient = new algosdk.Indexer(algodToken, "https://testnet-algorand.api.purestake.io/idx2", "");


const enc = new TextEncoder();
let lsig;

( async () => {
    const filePath = path.join(process.cwd(), 'Teal/vat_contract_account.teal');
    const data = fs.readFileSync(filePath);
    const results = await algodClient.compile(data).do();
    const program = new Uint8Array(Buffer.from(results.result, "base64"));
    lsig = algosdk.makeLogicSig(program);
})();


async function retriveTransactionsHistory( address, start_time, tx_type, assetIndex, currencyGreater ){
    let transactionInfo = await indexerClient.searchForTransactions();
    if( address ) transactionInfo = transactionInfo.address(address)
    if( start_time ) transactionInfo = transactionInfo.afterTime(start_time)
    if( tx_type ) transactionInfo = transactionInfo.txType(tx_type)
    if( assetIndex ) transactionInfo = transactionInfo.assetID(assetIndex)
    if( assetIndex ) transactionInfo = transactionInfo.currencyGreaterThan(currencyGreater)
    
    transactionInfo = transactionInfo.do();

    return transactionInfo
}


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
}
function create_algo_address() {
    let _account = algosdk.generateAccount();
    let _passphrase = algosdk.secretKeyToMnemonic(_account.sk);
    return { address: _account.addr, mnemonic: _passphrase };
};

async function get_tx_params(){
    let params = await algodClient.getTransactionParams().do();
    params.fee = 10;
    return params;
}
async function create_asset( account, totalIssuance, decimals, defaultFrozen, unitName, assetName, note, assetURL, assetMetadataHash, manager, reserve, freeze, clawback){
    
    let address = account.addr;
    // encode the notes
    note = enc.encode(note);
    // suggested params
    let params = await get_tx_params();
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

async function clawback_logic_signature(
    amount,
    from_add,
    to_add,
    assetID
){
    let params = await get_tx_params();
    let t_tx_1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
        process.env.APP_ADDRESS, 
        to_add, 
        undefined, 
        from_add,
        amount, 
        undefined, 
        assetID, 
        params
    );

    let rawSignedTxn = algosdk.signLogicSigTransactionObject(t_tx_1, lsig);
    try {
        let rtx = await algodClient.sendRawTransaction(rawSignedTxn.blob).do()
        await waitForConfirmation(algodClient, rtx.txId);
    } catch( err ){
        console.log("transaction errored ")
    }
    
}


async function app_atomic_transfer_user_payment( 
    pay_amount,
    user_address,
    merchant_addres,
    escrow_address
){
    let params = await get_tx_params();
    let assetID = parseInt( process.env.ASSET_VAT );
    let appID = parseInt( process.env.APP_ID );
    let appAddress = process.env.APP_ADDRESS;
    let asset_tourist_id = parseInt( process.env.ASSET_TOURIST );
    let asset_merchant_id = parseInt( process.env.ASSET_MERCHANT );
    let pay_amount_vat = ( pay_amount / 100 ) * 20;

    console.log(
        assetID,
        appID,
        appAddress,
        asset_tourist_id,
        asset_merchant_id,
        pay_amount_vat
    )


    // check tourist token app call
    let txn_app_1 = algosdk.makeApplicationNoOpTxn(
        appAddress, 
        params, 
        appID, 
        [new Uint8Array(Buffer.from("AsaAmountEq")), new Uint8Array([1])],
        [user_address],
        undefined,
        [asset_tourist_id]
    )
    
    console.log( txn_app_1.fee );

    // check merchant token call
    let txn_app_2 = algosdk.makeApplicationNoOpTxn(
        appAddress, 
        params, 
        appID, 
        [new Uint8Array(Buffer.from("AsaAmountEq")), new Uint8Array([1])],
        [merchant_addres],
        undefined,
        [asset_merchant_id]
    )

    // payment from tourist to merchant
    let tx_1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
        appAddress, 
        merchant_addres, 
        undefined, 
        user_address,
        pay_amount, 
        enc.encode("transfer tourist to merchant"), 
        assetID, 
        params
    );

    // payment from merchant to escrow
    let tx_2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
        appAddress, 
        escrow_address, 
        undefined, 
        merchant_addres,
        pay_amount_vat, 
        enc.encode("deposit vat to escrow"), 
        assetID, 
        params
    );

    // Group transactions
    txn_app_1.fee = 1000;
    txn_app_2.fee = 1000;
    tx_1.fee = 1000;
    tx_2.fee = 1000;
    let txns = [txn_app_1, txn_app_2, tx_1, tx_2  ];
    algosdk.assignGroupID(txns)

    // sign transactions
    let s_txn_app_1 = algosdk.signLogicSigTransactionObject(txn_app_1, lsig);
    let s_txn_app_2 = algosdk.signLogicSigTransactionObject(txn_app_2, lsig);
    let s_tx_1 = algosdk.signLogicSigTransactionObject(tx_1, lsig);
    let s_tx_2 = algosdk.signLogicSigTransactionObject(tx_2, lsig);
    
    let signed = [];
    signed.push(s_txn_app_1.blob);
    signed.push(s_txn_app_2.blob)
    signed.push(s_tx_1.blob);
    signed.push(s_tx_2.blob);

    //submit and wait for the tx to complete
    let tx = await algodClient.sendRawTransaction(signed).do();
    console.log("Transaction : " + tx.txId);
    await waitForConfirmation(algodClient, tx.txId);
}

async function create_id_asset( account ){
    return await create_asset(
        account,
        1000000000000,
        0,
        true,
        "ID_TOKEN",
        "ID_TOKEN",
        "ID",
        "http://google.com",
        "16efaa3924a6fd9d3a4824799a4ac65d",
        account.addr,
        account.addr,
        account.addr,
        account.addr
    );
}
async function create_merchant_asset( account ){
    return await create_asset(
        account,
        1000000000000,
        0,
        true,
        "MCH",
        "MERCHANT",
        "MCH",
        "http://google.com",
        "16efaa3924a6fd9d3a4824799a4ac65d",
        account.addr,
        account.addr,
        account.addr,
        account.addr
    );
}
async function create_vat_asset( account ){
    return await create_asset(
        account,
        1000000000000,
        process.env.ASSET_VAT_DECIMALS,
        true,
        "VAT",
        "VAT",
        "VAT",
        "http://google.com",
        "16efaa3924a6fd9d3a4824799a4ac65d",
        account.addr,
        account.addr,
        account.addr,
        account.addr
    );
}
async function get_account_info( address ){
    return await algodClient.accountInformation(address).do();
}
function get_account( mnemonic ){
    return algosdk.mnemonicToSecretKey(mnemonic);
}
async function opt_in( account, assetID ){
    // Opting in to transact with the new asset
    // Allow accounts that want recieve the new asset
    // Have to opt in. To do this they send an asset transfer
    // of the new asset to themseleves 
    // In this example we are setting up the 3rd recovered account to 
    // receive the new asset
    let sender = account.addr;
    let recipient = sender;
    let note = undefined;
    // We set revocationTarget to undefined as 
    // This is not a clawback operation
    let revocationTarget = undefined;
    // CloseReaminerTo is set to undefined as
    // we are not closing out an asset
    let closeRemainderTo = undefined;
    // We are sending 0 assets
    amount = 0;
    let params = await get_tx_params();
    // signing and sending "txn" allows sender to begin accepting asset specified by creator and index
    let opttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
            amount, note, assetID, params);
    // Must be signed by the account wishing to opt in to the asset    
    rawSignedTxn = opttxn.signTxn(account.sk);
    let opttx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
    console.log("Transaction : " + opttx.txId);
    // wait for transaction to be confirmed
    await waitForConfirmation(algodClient, opttx.txId);
    //You should now see the new asset listed in the account information
    console.log("Done opt in = " + account.addr);
}
async function payment( from_acc, to_add, note ){
    let params = await get_tx_params();
    
    note = enc.encode(note);

    let txn = algosdk.makePaymentTxnWithSuggestedParams(from_acc.addr, to_add, 1000000, undefined, note, params);   
    // sign tx
    let signedTxn = txn.signTxn(from_acc.sk);
    let txId = txn.txID().toString();
    console.log("Signed transaction with txID: %s", txId);
    // send tx
    await algodClient.sendRawTransaction(signedTxn).do();
    // wait for transaction to be confirmed
    let confirmedTxn = await waitForConfirmation(algodClient, txId);
    //Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
    let mytxinfo = JSON.stringify(confirmedTxn.txn.txn, undefined, 2);
    console.log("Transaction information: %o", mytxinfo);
    var string = new TextDecoder().decode(confirmedTxn.txn.txn.note);
    console.log("Note field: ", string);
}
// Function used to print asset holding for account and assetid
async function printAssetHolding (algodclient, account, assetid) {
    // note: if you have an indexer instance available it is easier to just use this
    //     let accountInfo = await indexerClient.searchAccounts()
    //    .assetID(assetIndex).do();
    // and in the loop below use this to extract the asset for a particular account
    // accountInfo['accounts'][idx][account]);
    let accountInfo = await algodclient.accountInformation(account).do();
    for (idx = 0; idx < accountInfo['assets'].length; idx++) {
        let scrutinizedAsset = accountInfo['assets'][idx];
        if (scrutinizedAsset['asset-id'] == assetid) {
            let myassetholding = JSON.stringify(scrutinizedAsset, undefined, 2);
            console.log("assetholdinginfo = " + myassetholding);
            break;
        }
    }
};
async function get_asset_holdings ( account, assetid) {
    // note: if you have an indexer instance available it is easier to just use this
    //     let accountInfo = await indexerClient.searchAccounts()
    //    .assetID(assetIndex).do();
    // and in the loop below use this to extract the asset for a particular account
    // accountInfo['accounts'][idx][account]);
    let accountInfo = await algodClient.accountInformation(account).do();
    for (idx = 0; idx < accountInfo['assets'].length; idx++) {
        let scrutinizedAsset = accountInfo['assets'][idx];
        if (scrutinizedAsset['asset-id'] == assetid) {
            return scrutinizedAsset.amount;
        }
    }
};
async function transfer_asset( from_acc, to_add, note, amount, assetID ){

    let sender = from_acc.addr;
    let recipient = to_add;

    // Transfer New Asset:
    revocationTarget = undefined;
    closeRemainderTo = undefined;
    let params = await get_tx_params();

    // encode the notes
    note = enc.encode(note);

    // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
    let xtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
            amount, note, assetID, params);
    // Must be signed by the account sending the asset  
    rawSignedTxn = xtxn.signTxn(from_acc.sk)
    let xtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
    console.log("Transaction : " + xtx.txId);
    // wait for transaction to be confirmed
    await waitForConfirmation(algodClient, xtx.txId);

    // You should now see the 10 assets listed in the account information
    await printAssetHolding(algodClient, to_add, assetID);
}

async function clawback_asset( clawback_acc, from_add,  to_add, note, amount, assetID ){

    sender = clawback_acc.addr;
    closeRemainderTo = undefined;
    // encode the notes
    note = note ? enc.encode(note) : undefined;

    let params = await get_tx_params();

    // signing and sending "txn" will send "amount" assets from "from_add" to "recipient",
    // if and only if sender == clawback manager for this asset

    let rtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, to_add, closeRemainderTo, from_add,
       amount, note, assetID, params);
    // Must be signed by the account that is the clawback address    
    rawSignedTxn = rtxn.signTxn(clawback_acc.sk)
    let rtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
    console.log("Transaction : " + rtx.txId);
    // wait for transaction to be confirmed
    await waitForConfirmation(algodClient, rtx.txId);

    // You should now see 0 assets listed in the account information
    // for the third account
    console.log("Account 3 = " + to_add);
    await printAssetHolding(algodClient, to_add, assetID);
}
async function freeze_address( freeze_issuer_acc, freeze_reciver_add, note, freeze_state, assetID ){
    // The asset was created and configured to allow freezing an account
    // If the freeze address is set "", it will no longer be possible to do this.
    // In this example we will now freeze account3 from transacting with the 
    // The newly created asset. 
    // The freeze transaction is sent from the freeze acount
    // Which in this example is account2 
    from = freeze_issuer_acc.addr;
    freezeTarget = freeze_reciver_add;
    freezeState = freeze_state;

    let params = await get_tx_params();
    // encode the notes
    note = enc.encode(note);

    // The freeze transaction needs to be signed by the freeze account
    let ftxn = algosdk.makeAssetFreezeTxnWithSuggestedParams(from, note,
        assetID, freezeTarget, freezeState, params)

    // Must be signed by the freeze account   
    rawSignedTxn = ftxn.signTxn(freeze_issuer_acc.sk)
    let ftx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
    console.log("Transaction : " + ftx.txId);
    // wait for transaction to be confirmed
    await waitForConfirmation(algodClient, ftx.txId);

    // You should now see the asset is frozen listed in the account information
    console.log("Account 3 = " + freeze_reciver_add);
    await printAssetHolding(algodClient, freeze_reciver_add, assetID);
}


module.exports = {
    waitForConfirmation,
    create_algo_address,
    get_tx_params,
    get_account_info,
    get_account,
    opt_in,
    payment,
    transfer_asset,
    freeze_address,
    clawback_asset,
    create_id_asset,
    create_merchant_asset,
    create_vat_asset,
    get_asset_holdings,
    retriveTransactionsHistory,
    app_atomic_transfer_user_payment,
    clawback_logic_signature
}