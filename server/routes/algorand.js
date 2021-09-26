require('dotenv').config();
var express = require('express');
var passport = require('passport');
var router = express.Router();
var {body, check} = require('express-validator');
var algo = require('../../algo-sdk/index');
var auth = require('../middleware/auth');
var utils = require('../../utils/functions');
var AlgoAsset = require('../models/algo-asset'); 
var Application = require('../models/application');
var vatRefound = require('../models/vat_refound');
var User = require('../models/user');
let MIN_PAYMENT = 150;
let ESCROW_ACCOUNT = process.env.ESCROW_ADD;


router.post('/create-token/id', 
auth.isLoggedIn,
async (req, res, next) => { 
  let user_algo_mnemonic = req.user.algo_mnemonic
  let account = algo.get_account( user_algo_mnemonic );
  let address_id =  await algo.create_id_asset( account );

  let Asset = new AlgoAsset({ id: address_id, type: "ASSET_TOURIST", decimals: 0 });
  await Asset.save();

  let successObj = [{param: "Asset", msg: `Succesfully created`}];
  req.flash('success', JSON.stringify(successObj));
  res.redirect('/dashboard');
});

router.post('/create-token/merchant', 
auth.isLoggedIn,
async (req, res, next) => { 
  let user_algo_mnemonic = req.user.algo_mnemonic;
  let account = algo.get_account( user_algo_mnemonic );
  let address_id =  await algo.create_merchant_asset( account );

  let Asset = new AlgoAsset({ id: address_id, type: "ASSET_MERCHANT", decimals: 0 });
  await Asset.save();

  let successObj = [{param: "Asset", msg: `Succesfully created`}];
  req.flash('success', JSON.stringify(successObj));

  res.redirect('/dashboard');
});
router.post('/create-token/vat', 
auth.isLoggedIn,
async (req, res, next) => { 
  let user_algo_mnemonic = req.user.algo_mnemonic;
  let account = algo.get_account( user_algo_mnemonic );
  let address_id =  await algo.create_vat_asset( account );

  let Asset = new AlgoAsset({ id: address_id, type: "ASSET_VAT", decimals: 2 });
  await Asset.save();

  let successObj = [{param: "Asset", msg: `Succesfully created`}];
  req.flash('success', JSON.stringify(successObj));

  res.redirect('/dashboard');
});
router.post('/opt-in', 
auth.isLoggedIn,
async (req, res, next) => { 
  let user_algo_mnemonic = req.user.algo_mnemonic;
  let token_id = parseInt( req.body.tokenId );
  let account = algo.get_account( user_algo_mnemonic );
  await algo.opt_in( account, token_id );

  let asset = await AlgoAsset.findOne({ id: token_id });
  if( asset && !( asset.type == "ASSET_VAT" ) ) {
    let newApplication = new Application({ amount: 1, tokenId: token_id, owner: req.user._id });
    await newApplication.save();
  }

  let successObj = [{param: "Opt in", msg: `Succesfully opted in`}];
  req.flash('success', JSON.stringify(successObj));

  res.redirect('/dashboard');
});


router.post('/transfer', 
auth.isLoggedIn,
async (req, res, next) => { 
  let user_algo_mnemonic = req.user.algo_mnemonic;
  let token_id = parseInt( req.body.tokenId );
  let toAddress = req.body.toAddress;
  let note = req.body.note;
  let amount = parseInt( req.body.amount );

  let account = algo.get_account( user_algo_mnemonic );

  await algo.transfer_asset( account, toAddress, note, amount, token_id );

  let successObj = [{param: "Transfer", msg: `Succesfully transferred`}];
  req.flash('success', JSON.stringify(successObj));

  res.redirect('/dashboard');

});
router.post('/freeze', 
auth.isLoggedIn,
async (req, res, next) => { 
  let user_algo_mnemonic = req.user.algo_mnemonic;
  let token_id = parseInt( req.body.tokenId );
  let toAddress = req.body.toAddress;
  let note = req.body.note;
  let freezeState = req.body.freezeState == "true";
  let account = algo.get_account( user_algo_mnemonic );

  await algo.freeze_address( account, toAddress, note, freezeState, token_id );

  let successObj = [{param: "Freeze", msg: `Succesfully freezed`}];
  req.flash('success', JSON.stringify(successObj));

  res.redirect('/dashboard');
});

router.post('/clawback', 
auth.isLoggedIn,
async (req, res, next) => { 
  let user_algo_mnemonic = req.user.algo_mnemonic;
  
  let token_id = parseInt( req.body.tokenId );
  let fromAddress = req.body.fromAddress;
  let toAddress = req.body.toAddress;
  let note = req.body.note;
  
  let applicationId = req.body.applicationId;

  let account = algo.get_account( user_algo_mnemonic );
  let asset = await AlgoAsset.findOne( { id: token_id } );

  let amount ;
  if( asset.type == "ASSET_VAT" ){
    amount = utils.roundAlgoAssetToDecimal( parseFloat( req.body.amount ), process.env.ASSET_VAT_DECIMALS) ;
    await algo.clawback_logic_signature( amount, fromAddress, toAddress, token_id );
  } else {
    amount = parseInt( req.body.amount );
    await algo.clawback_asset( account, fromAddress, toAddress, note, amount, token_id );
  }

  let updated = await Application.findByIdAndUpdate( applicationId, { $set: { completed: true } } );
  console.log( updated );

  let successObj = [{param: "Transfer", msg: `Succesfully transferred`}];
  req.flash('success', JSON.stringify(successObj));

  res.redirect('/dashboard');
});


router.post('/clear-escrow', 
auth.isLoggedIn,
async (req, res, next) => { 
  let escrow_amount = await algo.get_asset_holdings( process.env.ESCROW_ADD, process.env.ASSET_VAT ) ;
  await algo.clawback_logic_signature( parseInt( escrow_amount ), process.env.ESCROW_ADD, process.env.AUTHORITY_ADD, parseInt(process.env.ASSET_VAT) );


  let successObj = [{param: "Transfer", msg: `Succesfully cleared escrow`}];
  req.flash('success', JSON.stringify(successObj));

  res.redirect('/dashboard');
});


router.post('/pay', 
auth.isLoggedIn, 
async (req, res, next) => { 

  let authority = await User.findOne( { role: "AUTHORITY" } ).exec();
  let authoirty_mnemonic = authority.algo_mnemonic;
  let account = algo.get_account( authoirty_mnemonic );

  let fromAddress = req.user.algo_address;

  let token_id = parseInt( req.body.tokenId );
  let toAddress = req.body.toAddress;
  let amount = utils.roundAlgoAssetToDecimal( parseFloat( req.body.amount ), process.env.ASSET_VAT_DECIMALS) ;

  console.log( amount )
  
  if( amount < MIN_PAYMENT ) {
    let errorObj = [{param: "Payment", msg: `The minimum spending is ${MIN_PAYMENT}`}];
    req.flash('errors', JSON.stringify(errorObj));
    res.redirect('/dashboard');
    return;
  }

  let fromAddressHoldings = parseFloat( await algo.get_asset_holdings( fromAddress, token_id ) );
  if( fromAddressHoldings < amount ){
    let errorObj = [{param: "Payment", msg: `You don't have sufficent credit`}];
    req.flash('errors', JSON.stringify(errorObj));
    res.redirect('/dashboard');
    return;
  }

  await algo.app_atomic_transfer_user_payment( 
    amount, 
    fromAddress, 
    toAddress,
    ESCROW_ACCOUNT
  );

  let successObj = [{param: "Payment", msg: `Succesfull`}];
  req.flash('success', JSON.stringify(successObj));

  res.redirect('/dashboard');
});

async function getTxInfos(
  vat_asset_id,
  user_request_payment_add,
  vatRefoundHistory
){
  

  let date_1970 = new Date(null).getTime(); // date of year 1970
  let daily_ms_time = 1000 * 60 * 60 * 24;

  let three_months_ago = new Date();
  three_months_ago.setMonth( three_months_ago.getMonth() - 3 );

  let three_months_ago_time = three_months_ago.getTime();
  let half_hour_ago = new Date().getTime() - 1000 * 60 * 30;
  let five_minutes_ago = new Date().getTime() - 1000 * 60 * 5;
  let one_minute_ago = new Date().getTime() - 1000 * 60 * 1;
  let yesterday_time = new Date().getTime() - daily_ms_time;
  
  // get the time from where to start retriving transactions
  let latest_refound_time = 0;
  if( vatRefoundHistory.history.length ){
    let latest_time =  vatRefoundHistory.history[ vatRefoundHistory.history.length - 1 ];
    latest_refound_time = latest_time.time ;
  } else {
    latest_refound_time = date_1970; // adjust this
  }
  let latest_refound_time_iso = new Date(latest_refound_time).toISOString();

  // refound transactions executed after the refound_limit_time
  let refound_limit_time = one_minute_ago; // adjust this
  if( refound_limit_time < latest_refound_time ){ // if the refound_limit_time is before the latest refound request
    refound_limit_time = latest_refound_time; // then the refound_limit_time becomes the time of the latest refound request
  }
  
  let transaction_history = await algo.retriveTransactionsHistory( 
    user_request_payment_add,
    latest_refound_time_iso,
    "axfer", // clawback transactions
    vat_asset_id,
    MIN_PAYMENT
  );
  return [
    transaction_history,
    refound_limit_time,
  ]
}

router.post('/pay_user_vat', 
auth.isLoggedIn, 
async (req, res, next) => {

  let user_request_payment_add = req.body.toAddress;
  let applicationId = req.body.applicationId;

  let vat_asset_id = parseInt( process.env.ASSET_VAT );

  // check the latest vat refound from the passed address
  let vatRefoundHistory = await vatRefound.findOne({ address: user_request_payment_add });
  if( !vatRefoundHistory ) vatRefoundHistory = new vatRefound({ address: user_request_payment_add, history: [] });
  

  let [ transaction_history, refound_limit_time ] = await getTxInfos(
    vat_asset_id,
    user_request_payment_add,
    vatRefoundHistory
  )
  
  let refounded_total = 0;
  let not_refounded_total = 0;
  for( let transaction of transaction_history.transactions ){
   
    let tx_details = transaction["asset-transfer-transaction"];
    
    let receiver = tx_details.receiver;
    if( receiver == user_request_payment_add ) { // user bought some vat tokens
      continue;
    } else { // user spent some vat tokens
      let amount = tx_details.amount;
      let amount_to_refound = ( amount / 100 ) * 20;
      let tx_time = transaction['round-time'] * 1000;
      amount_to_refound = Math.round( amount_to_refound );

      let merchant_add = receiver;
      let toursit_add = user_request_payment_add;

      if( tx_time < refound_limit_time ) { // tx executed more than x time ago is non refoundable
        not_refounded_total = not_refounded_total + amount_to_refound;
        await algo.clawback_logic_signature( amount_to_refound, ESCROW_ACCOUNT, merchant_add, vat_asset_id );
        continue;
      }

      await algo.clawback_logic_signature( amount_to_refound, ESCROW_ACCOUNT, toursit_add, vat_asset_id );
      refounded_total = refounded_total + amount_to_refound;
    }
  } 
  await Application.findByIdAndUpdate( applicationId, { $set: { completed: true } } );
  
  console.log("updated application")
  vatRefoundHistory.history.push({
    time: Date.now(),
    amount: refounded_total
  });
  await vatRefoundHistory.save();
  console.log("updated history")

  let successObj = [{
    param: "Success", 
    msg: `Refounded ${utils.addAlgoAssetDecimals( refounded_total, process.env.ASSET_VAT_DECIMALS )} VAT Coinst to Tourist and ${utils.addAlgoAssetDecimals( not_refounded_total, process.env.ASSET_VAT_DECIMALS )} Coins to Merchants`
  }];

  req.flash('success', JSON.stringify(successObj));
  console.log("redirectiong")
  res.redirect('/dashboard');
});

router.post('/pay_user_vat_preview', 
auth.isLoggedIn, 
async (req, res, next) => {

  let user_request_payment_add = req.body.toAddress;
  console.log( req.body );
  let vat_asset = await AlgoAsset.findOne( { type:"ASSET_VAT" } )
  let vat_asset_id = vat_asset.id;

  // check the latest vat refound from the passed address
  let vatRefoundHistory = await vatRefound.findOne({ address: user_request_payment_add });
  if( !vatRefoundHistory ) vatRefoundHistory = new vatRefound({ address: user_request_payment_add, history: [] });

  let [ transaction_history, refound_limit_time ] = await getTxInfos(
    vat_asset_id,
    user_request_payment_add,
    vatRefoundHistory
  )
  
  let refounded_total = 0;
  let not_refounded_total = 0;
  let to_refound_tx = [];
  let to_not_refound_tx = [];
  for( let transaction of transaction_history.transactions ){
   
    let tx_details = transaction["asset-transfer-transaction"];
    
    let receiver = tx_details.receiver;
    if( receiver == user_request_payment_add ) { // user bought some vat tokens
      continue;
    } else { // user spent some vat tokens
      let amount = tx_details.amount;
      let amount_to_refound = ( amount / 100 ) * 20;
      let tx_time = transaction['round-time'] * 1000;
      amount_to_refound = Math.round( amount_to_refound );
      transaction.refound = amount_to_refound;

      let fromAdd = receiver;
      let toAdd = user_request_payment_add;

      if( tx_time < refound_limit_time ) { // tx executed more than three months ago
        not_refounded_total = not_refounded_total + amount_to_refound;
        transaction.refounded = false;
        to_not_refound_tx.push(transaction);
        continue;
      }
      transaction.refounded = true;
      to_refound_tx.push(transaction)
      refounded_total = refounded_total + amount_to_refound;
    }
  } 

  res.status(200).send({
    refound: refounded_total,
    not_refound: not_refounded_total,
    to_not_refound_tx: to_not_refound_tx,
    to_refound_tx: to_refound_tx
  });
});


module.exports = router;