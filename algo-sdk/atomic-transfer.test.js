import dotenv from "dotenv";
dotenv.config()
import fs from 'fs';
import path  from 'path';
import algosdk from 'algosdk';
import { TextEncoder  }  from 'util'; 
import Blob from "cross-blob"
import FileReader from 'filereader';

// ALGORAND TESTNET PURESTAKE 
const algodToken = {
    "x-api-key": process.env.API_KEY 
};
let algodClient = new algosdk.Algodv2(algodToken, "https://testnet-algorand.api.purestake.io/ps2", "");


const enc = new TextEncoder();

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

async function get_tx_params(){
    let params = await algodClient.getTransactionParams().do();
    params.fee = 100;
    return params;
}

async function download_txns(name, txns) {
    let b = new Uint8Array(0);
    for(let txn in txns){
        b = concatTypedArrays(b, txns[txn])
    }
    console.log( b )
    var blob = new Blob([b], {type: "application/octet-stream"});
    
    var buffer = new Buffer(await blob.arrayBuffer());
    let text_path = path.join(process.cwd(), 'test.txt');
    console.log("writing buffer to text into ", text_path)
    fs.writeFileSync( text_path, buffer, {})
    console.log("wrote")
}
function concatTypedArrays(a, b) { // a, b TypedArray of same type
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}


( async () => {

    const filePath = path.join(process.cwd(), 'Teal/vat_contract_account.teal');
    const data = fs.readFileSync(filePath);
    const results = await algodClient.compile(data).do();
    console.log("Hash = " + results.hash);
    console.log("Result = " + results.result);
    const program = new Uint8Array(Buffer.from(results.result, "base64"));

    const lsig = algosdk.makeLogicSig(program);

    let params = await get_tx_params();
    let assetID = 28244699;
    let appID = 24248443;

    let pay_amount = 200;
    let pay_amount_vat = ( pay_amount / 100 ) * 20;

    console.log(
        `PAY AMOUNT VAT ${pay_amount_vat}\n`
    )
    console.log(
        'PARAMS', params
    )

    // check tourist token app call
    let txn_app_1 = algosdk.makeApplicationNoOpTxn(
        "VB4OBNW626ZTZYRZVPRB6CAPKXBINMRUCWHAGAAI6B3TJPKFIVBPUEEFRY", 
        params, 
        appID, 
        [new Uint8Array(Buffer.from("AsaAmountEq")), new Uint8Array([1])],
        ["QLLBH6PS7WPKECGS37YWKFGW4LUJB2WME5NP47KVUFRAX7ATK55D4GSLMU"],
        undefined,
        [28244470]
    )
    
    console.log( txn_app_1.fee );

    // check merchant token call
    let txn_app_2 = algosdk.makeApplicationNoOpTxn(
        "VB4OBNW626ZTZYRZVPRB6CAPKXBINMRUCWHAGAAI6B3TJPKFIVBPUEEFRY", 
        params, 
        appID, 
        [new Uint8Array(Buffer.from("AsaAmountEq")), new Uint8Array([1])],
        ["PYQZHXW7I5TKUU535PCH5HYL435CJ32LN7ET3ZV432YMMJN3LWZMWQZZ6A"],
        undefined,
        [28244597]
    )

    // payment from tourist to merchant
    let tx_1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
        "VB4OBNW626ZTZYRZVPRB6CAPKXBINMRUCWHAGAAI6B3TJPKFIVBPUEEFRY", 
        "PYQZHXW7I5TKUU535PCH5HYL435CJ32LN7ET3ZV432YMMJN3LWZMWQZZ6A", 
        undefined, 
        "QLLBH6PS7WPKECGS37YWKFGW4LUJB2WME5NP47KVUFRAX7ATK55D4GSLMU",
        pay_amount, 
        enc.encode("transfer tourist merchant"), 
        assetID, 
        params
    );

    // payment from merchant to escrow
    let tx_2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
        "VB4OBNW626ZTZYRZVPRB6CAPKXBINMRUCWHAGAAI6B3TJPKFIVBPUEEFRY", 
        "TTMW55E765Z3NJNYR6VYU3IF2HGXWSVG4THQNNDSK2JMMZK5SX6VPTFEFE", 
        undefined, 
        "PYQZHXW7I5TKUU535PCH5HYL435CJ32LN7ET3ZV432YMMJN3LWZMWQZZ6A",
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
    

    // console.log("print blob")
    // await download_txns("grouped.txns", signed.map((t)=>{return t}))

    // 1. get the output text from download_txns
    // 2. run sandbox private network
    // 3. Run the following commands:
    // ./sandbox/sandbox  copyTo test.txt
    // ./sandbox/sandbox  goal clerk dryrun -t test.txt


})();
