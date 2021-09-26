require("dotenv").config();
const algosdk = require('algosdk');

// const token = "<algod-token>";
// const server = "<algod-address>";
// const port = <algod-port>;
// sandbox
const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const server = "http://localhost";
const port = 4001;

const fs = require('fs'); 
// create an algod v2 client
const algodToken = {
    "x-api-key": process.env.API_KEY 
};
let algodclient = new algosdk.Algodv2(algodToken, "https://testnet-algorand.api.purestake.io/ps2", "");

// import your private key mnemonic
// let PASSPHRASE = "<25-word-mnemonic>";
let PASSPHRASE = "awake used crawl list cruel harvest useful flag essay speed glad salmon camp sudden ride symptom test kind version together project inquiry diet abandon budget";
var myAccount = algosdk.mnemonicToSecretKey(PASSPHRASE);
console.log("My Address: " + myAccount.addr);
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


(async () => {

    // get suggested parameter
    let params = await algodclient.getTransactionParams().do();
    // comment out the next two lines to use suggested fee 
    params.fee = 1000;
    params.flatFee = true;
    console.log(params);
    // create logic sig
    // samplearg.teal
    // This code is meant for learning purposes only
    // It should not be used in production
    // arg_0
    // btoi
    // int 123
    // ==
    // see more info here: https://developer.algorand.org/docs/features/asc1/sdks/#accessing-teal-program-from-sdks
    var fs = require('fs'),
        path = require('path');

    const filePath = path.join(__dirname, '../Teal/vat_contract_account.teal');
    const data = fs.readFileSync(filePath);
    const results = await algodclient.compile(data).do();
    console.log("Hash = " + results.hash);
    console.log("Result = " + results.result);
    const program = new Uint8Array(Buffer.from(results.result, "base64"));

    let lsig = algosdk.makeLogicSig(program);

    
    // Setup a transaction
    let sender = myAccount.addr;
    let receiver = "SOEI4UA72A7ZL5P25GNISSVWW724YABSGZ7GHW5ERV4QKK2XSXLXGXPG5Y";
    // let receiver = "<receiver-address>"";
    let amount = 10000;
    let closeToRemaninder = undefined;
    let note = undefined;
    let txn = algosdk.makePaymentTxnWithSuggestedParams(sender, receiver, amount, closeToRemaninder, note, params)
    
    // source debugging
    dryrunResponse = await dryrunDebugging(lsig, txn, data);
    var textedJson = JSON.stringify(dryrunResponse, undefined, 4);
    console.log("source Response ");  
    console.log(textedJson);

    // compile debugging
    dryrunResponse = await dryrunDebugging(lsig, txn, null);
    var textedJson = JSON.stringify(dryrunResponse, undefined, 4);
    console.log("compile Response ");   
    console.log(textedJson);

    // Create the LogicSigTransaction with contract account LogicSig
    let rawSignedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);
    // fs.writeFileSync("simple.stxn", rawSignedTxn.blob);
    // send raw LogicSigTransaction to network 

    let tx = (await algodclient.sendRawTransaction(rawSignedTxn.blob).do());
    console.log("Transaction : " + tx.txId);    
    await waitForConfirmation(algodclient, tx.txId);

})().catch(e => {
    console.log(e.message);
    console.log(e);
});
async function dryrunDebugging(lsig, txn, data) {
    if (data == null)
    {
        //compile
        txns = [{
            lsig: lsig,
            txn: txn,
        }];        
    }
    else
    {
        // source
        txns = [{
            txn: txn,
        }];
        sources = [new algosdk.modelsv2.DryrunSource("lsig", data.toString("utf8"), 0)];
    }


    const dr = new algosdk.modelsv2.DryrunRequest({
        txns: txns,
        sources: sources,
    });
    dryrunResponse = await algodclient.dryrun(dr).do();
    return dryrunResponse;
}

// output should look like this
// {
//     "error": "",
//         "protocol-version": "https://github.com/algorandfoundation/specs/tree/e5f565421d720c6f75cdd186f7098495caf9101f",
//             "txns": [
//                 {
//                     "disassembly": [
//                         "// version 1",
//                         "intcblock 123",
//                         "arg_0",
//                         "btoi",
//                         "intc_0",
//                         "==",
//                         ""
//                     ],
//                     "logic-sig-messages": [
//                         "PASS"
//                     ],
//                     "logic-sig-trace": [
//                         {
//                             "line": 1,
//                             "pc": 1,
//                             "stack": []
//                         },
//                         {
//                             "line": 2,
//                             "pc": 4,
//                             "stack": []
//                         },
//                         {
//                             "line": 3,
//                             "pc": 5,
//                             "stack": [
//                                 {
//                                     "bytes": "ew==",
//                                     "type": 1,
//                                     "uint": 0
//                                 }
//                             ]
//                         },
//                         {
//                             "line": 4,
//                             "pc": 6,
//                             "stack": [
//                                 {
//                                     "bytes": "",
//                                     "type": 2,
//                                     "uint": 123
//                                 }
//                             ]
//                         },
//                         {
//                             "line": 5,
//                             "pc": 7,
//                             "stack": [
//                                 {
//                                     "bytes": "",
//                                     "type": 2,
//                                     "uint": 123
//                                 },
//                                 {
//                                     "bytes": "",
//                                     "type": 2,
//                                     "uint": 123
//                                 }
//                             ]
//                         },
//                         {
//                             "line": 6,
//                             "pc": 8,
//                             "stack": [
//                                 {
//                                     "bytes": "",
//                                     "type": 2,
//                                     "uint": 1
//                                 }
//                             ]
//                         }
//                     ]
//                 }
//             ]
// }