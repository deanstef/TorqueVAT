var express = require('express');
var passport = require('passport');
var router = express.Router();
var auth = require('../middleware/auth');
var {body, check} = require('express-validator');

var User = require('../models/user');
var AlgoAsset = require('../models/algo-asset');
var Application = require('../models/application');

router.get('/', 
async (req, res, next) => { 
  res.render('index'); 
});
router.get('/dashboard',
auth.isLoggedIn, 
async (req, res, next) => { 
  res.render('dashboard',{
    users: await User.find().select({ name: 1, passaport_id: 1, role: 1, algo_address: 1 }),
    assets: await AlgoAsset.find(),
    applications: await Application.find({ completed: false }).populate('owner').exec(),
  }); 
});

router.post('/apply/id', 
auth.isLoggedIn, 
async (req, res, next) => { 
  let amount = parseFloat( req.body.amount ) ;
  let token_id = parseInt( req.body.tokenId );

  let newApplication = new Application({ amount: amount, tokenId: token_id, owner: req.user._id });
  await newApplication.save();

  let successObj = [{param: "Application", msg: `Request successfully sent`}];
  req.flash('success', JSON.stringify(successObj));

  res.redirect('/dashboard');
});

router.post('/apply/end', 
auth.isLoggedIn, 
async (req, res, next) => { 
  
  let application = await Application.findOne({ type: "END_TRAVEL", owner: req.user._id, completed: false  });
  if( application ){
    let obj = [{param: "Application", msg: `You have already a pending application of the same type`}];
    req.flash('errors', JSON.stringify(obj));
    res.redirect('/dashboard');
    return;
  }
  
  let newApplication = new Application({ 
    owner: req.user._id, 
    type: "END_TRAVEL" 
  });
  await newApplication.save();

  let successObj = [{param: "Application", msg: `Request successfully sent`}];
  req.flash('success', JSON.stringify(successObj));
  res.redirect('/dashboard');
});




module.exports = router;
