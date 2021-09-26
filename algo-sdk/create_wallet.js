const algosdk = require('algosdk');

const kmdtoken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const kmdserver = 'http://localhost';
const kmdport = '4002';

const kmdclient = new algosdk.Kmd(kmdtoken, kmdserver, kmdport);

let walletid = null;
let wallethandle = null;

(async () => {
    let walletObj = await kmdclient.createWallet("MyTestWallet2", "testpassword", "", "sqlite");
    let walletid = walletObj.wallet.id;
    console.log( walletObj.wallet )
    console.log("Created wallet:", walletid);

    let wallethandle = (await kmdclient.initWalletHandle(walletid, "testpassword")).wallet_handle_token;
    console.log("Got wallet handle:", wallethandle);

    let address1 = (await kmdclient.generateKey(wallethandle)).address;
    console.log("Created new account:", address1);
})()