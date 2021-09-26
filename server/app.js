var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var helmet = require('helmet');
var compression = require('compression'); // speed emprovement
const cluster = require("cluster");

var AlgoAsset = require('./models/algo-asset'); 
var algo = require('../algo-sdk/index'); 

var utils = require('../utils/functions');

// var createSocialMetaTags = require('./routes/socialMetaTags').createSocialMetaTags;
var passport = require('passport');

var flash = require('connect-flash');
var session = require('express-session');
var MongoStore  = require('connect-mongo');
var mongoose = require('mongoose')
var configDB = require('../config/database.js');

var r_index = require('./routes/index');
var r_auth = require('./routes/auth');
var r_algorand = require('./routes/algorand');

var app = express();
const FRONTEND_PATH = path.join(__dirname, '..', 'frontend');

// connect to the db
mongoose.connect( configDB.url, {useNewUrlParser: true, useUnifiedTopology: true})
.then(() => { console.log('MongoDB is connected') })
.catch(err => { console.log('MongoDB connection unsuccessful, ' + err ); });


app.set('views', path.join(FRONTEND_PATH, 'views'));
app.set('view engine', 'ejs');


//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(helmet());

//API RATE LIMIT
app.set('trust proxy', 1); // if you are under reverse proxy

app.use(cors({
  "origin": "*",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE"
}));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Security-Policy", "script-src 'self'");
  res.setHeader("Content-Security-Policy", "img-src * data: blob: ");
  next();
});

// app.use(logger('combined'));
// app.use(logger(`CLUSTER ${cluster.worker.id} - :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"`));
app.use(logger('dev'));


app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());
app.use(session({
  secret: '!BSCHFKRHAPASDFNOSEIIMO3!-',
  saveUninitialized: true,
  resave: true,
  store: MongoStore.create({ mongoUrl: configDB.url }) // store session in mongodb to use it with clusetering
}));


app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(FRONTEND_PATH, 'public'), { maxAge: 10 * 60 * 60 * 1000 } )); // 10 hours caching on browser
app.use(compression({ level: 6, threshold: 0 }));
app.use(flash());
// [ { param: "asd", msg: "asd"}, { param: "asd", msg: "asd"} ]

// DECLARING COMMON LOCALS PARAMETERS
app.use(async function(req, res, next){
  let errors = req.flash('errors');
  let success = req.flash('success');
  res.locals.user = req.user;
  res.locals.errors = errors;
  res.locals.success = success;
  res.locals.login = req.isAuthenticated();
  res.locals.admin = req.user ? ( req.user.role == "ADMIN" ? true: false ) : false ;

  // retrive vat token balance of user
  let vat_token = await AlgoAsset.findOne({ type: "ASSET_VAT" });
  if( vat_token ) { 
    let vat_token_balance = req.user ? await algo.get_asset_holdings( req.user.algo_address, vat_token.id ) : 0;
    res.locals.vat_token_balance = utils.addAlgoAssetDecimals(vat_token_balance, process.env.ASSET_VAT_DECIMALS);

    let vat_token_balance_escrow = await algo.get_asset_holdings( process.env.ESCROW_ADD, vat_token.id ) ;
    res.locals.vat_token_balance_escrow = utils.addAlgoAssetDecimals(vat_token_balance_escrow, process.env.ASSET_VAT_DECIMALS);
  }

  // check if the user has the identifier token 
  if( req.user && ( req.user.role == "MERCHANT" || req.user.role == "USER" ) ){
    if( req.user.role == "MERCHANT" ) { 
      let asset = await AlgoAsset.findOne({ type: "ASSET_MERCHANT" });
      let balance = await algo.get_asset_holdings( req.user.algo_address, asset.id );
      if( parseInt( balance ) ) { res.locals.verified = true }
    }
    else if ( req.user.role == "USER" ) {
      let asset = await AlgoAsset.findOne({ type: "ASSET_TOURIST" });
      let balance = await algo.get_asset_holdings( req.user.algo_address, asset.id );
      if( parseInt( balance ) ) { res.locals.verified = true }
    }
  }
  

  next();
});


require('./config/passport')(passport);
r_algorand
app.use('/', r_index);
app.use('/auth', r_auth);
app.use('/algo', r_algorand);

app.use(function(err, req, res, next) { res.status(err.status || 500).render('error'); });
app.get('/404', function(req, res){ res.render('404'); });
app.get('*', function(req, res){ res.redirect('/404'); });

// testing prupose only
( async () => {
  var vatRefound = require('./models/vat_refound');
  let vatRefoundHistory = await vatRefound.findOne({ address: process.env.USER_ADD });
  if( !vatRefoundHistory ){ vatRefoundHistory = new vatRefound({ address: process.env.USER_ADD, history: [] }); }
  vatRefoundHistory.history.push({ time: Date.now(), amount: 0 });
  await vatRefoundHistory.save();
})();

module.exports = app;