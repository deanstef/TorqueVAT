import dotenv from "dotenv";
dotenv.config()
import fs from 'fs';
import path  from 'path';
import algosdk from 'algosdk';
import { TextEncoder  }  from 'util'; 

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

    let t_tx_1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
        "VB4OBNW626ZTZYRZVPRB6CAPKXBINMRUCWHAGAAI6B3TJPKFIVBPUEEFRY", 
        "QLLBH6PS7WPKECGS37YWKFGW4LUJB2WME5NP47KVUFRAX7ATK55D4GSLMU", 
        undefined, 
        "TTMW55E765Z3NJNYR6VYU3IF2HGXWSVG4THQNNDSK2JMMZK5SX6VPTFEFE",
        40, 
        enc.encode("deposit vat to escrow"), 
        assetID, 
        params
    );

    let rawSignedTxn = algosdk.signLogicSigTransactionObject(t_tx_1, lsig);

    let rtx = (await algodClient.sendRawTransaction(rawSignedTxn.blob).do())
    await waitForConfirmation(algodClient, rtx.txId);

})();
