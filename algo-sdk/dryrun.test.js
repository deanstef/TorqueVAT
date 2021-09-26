require("dotenv").config();
const fs = require('fs');
const path = require('path');
const algosdk = require('algosdk');
var { TextEncoder, TextDecoder } = require('util'); 

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

// dryrunDebugging returns a response with disassembly, logic-sig-messages w PASS/REJECT and sig-trace
async function dryrunDebugging(lsig, txn, data) {
    if (data == null) {
        //compile
        txns = [{
            lsig: lsig,
            txn: txn,
        }];        
    } else {
        // source
        txns = [{
            txn: txn,
        }];
        sources = [new algosdk.modelsv2.DryrunSource("lsig", data.toString("utf8"), 0, 24248443)];
    }


    const dr = new algosdk.modelsv2.DryrunRequest({
        txns: txns,
        sources: sources,
    });
    dryrunResponse = await algodClient.dryrun(dr).do();
    return dryrunResponse;
}

( async () => {

    const filePath = path.join(__dirname, '../Teal/vat_contract_account.teal');
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
        "NAX6DPT66VH44JLIQXHLI7PS63FIYGJCOPKTF77CI2TFEZJDUSQRUGIFMY",
        450, 
        enc.encode("deposit vat to escrow"), 
        assetID, 
        params
    );

    let dryRunResponse = await dryrunDebugging(lsig, t_tx_1, data);
    console.log('Response : ', dryRunResponse)

    

})();
