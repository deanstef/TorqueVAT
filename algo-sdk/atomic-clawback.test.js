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
    params.fee = 10;
    return params;
}




async function download_txns(name, txns) {
    let b = new Uint8Array(0);
    for(let txn in txns){
        b = concatTypedArrays(b, txns[txn])
    }
    console.log( b )
    var blob = new Blob([b], {type: "application/octet-stream"});
    
    var buffer = new Buffer(await blob.arrayBuffer())
    fs.writeFile( path.join(process.cwd(), 'test.txt'), buffer, {}, (err, res) => {
        if(err){
            console.error(err)
            return
        }
        
    })
}

function concatTypedArrays(a, b) { // a, b TypedArray of same type
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}


( async () => {

    

    let params = await get_tx_params();
    let assetID = 28244699;

    let t_tx_1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
        "VB4OBNW626ZTZYRZVPRB6CAPKXBINMRUCWHAGAAI6B3TJPKFIVBPUEEFRY", 
        "QLLBH6PS7WPKECGS37YWKFGW4LUJB2WME5NP47KVUFRAX7ATK55D4GSLMU", 
        undefined, 
        "NAX6DPT66VH44JLIQXHLI7PS63FIYGJCOPKTF77CI2TFEZJDUSQRUGIFMY",
        450, 
        enc.encode("deposit vat to escrow"), 
        assetID, 
        params
    );

    let t_tx_2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
        "VB4OBNW626ZTZYRZVPRB6CAPKXBINMRUCWHAGAAI6B3TJPKFIVBPUEEFRY", 
        "PYQZHXW7I5TKUU535PCH5HYL435CJ32LN7ET3ZV432YMMJN3LWZMWQZZ6A", 
        undefined, 
        "QLLBH6PS7WPKECGS37YWKFGW4LUJB2WME5NP47KVUFRAX7ATK55D4GSLMU",
        450, 
        enc.encode("deposit vat to escrow"), 
        assetID, 
        params
    );


    let t_txns = [t_tx_1, t_tx_2];
    let txgroup = algosdk.assignGroupID(t_txns)
        
    let t_s_tx_1 = algosdk.signLogicSigTransactionObject(t_tx_1, lsig);
    let t_s_tx_2 = algosdk.signLogicSigTransactionObject(t_tx_2, lsig);
    
    let t_signed = [];
    t_signed.push(t_s_tx_1.blob);
    t_signed.push(t_s_tx_2.blob);

    

    // let t_tx = await algodClient.sendRawTransaction(t_signed).do();
    // console.log("Transaction : " + t_tx.txId);
    // await waitForConfirmation(algodClient, t_tx.txId);

    console.log("print blob")
    await download_txns("grouped.txns", t_signed.map((t)=>{return t}))

})();
