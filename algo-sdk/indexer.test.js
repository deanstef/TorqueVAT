require("dotenv").config();
const algosdk = require('algosdk');
var { TextEncoder  } = require('util'); 


const enc = new TextEncoder();

const index = require('./index');




( async () => { 
    let d = new Date();
    d.setMonth( d.getMonth() - 3 );

    let res = await index.retriveTransactionsHistory(
        "QLLBH6PS7WPKECGS37YWKFGW4LUJB2WME5NP47KVUFRAX7ATK55D4GSLMU",
        d.toISOString(),
        "axfer",
        28244699,
        10
    );
    console.log( res.transactions )
    
})()

// module.exports = {
 
// }