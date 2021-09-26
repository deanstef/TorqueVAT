var LocalStrategy = require('passport-local').Strategy;
// var FacebookStrategy = require('passport-facebook').Strategy;
// var TwitterStrategy = require('passport-twitter').Strategy;
// var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var User = require('../models/user');
var algo = require('../../algo-sdk/index');
// var configAuth = require('./auth');

module.exports = function(passport) {

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  },
  
  function(req, email, password, done) {
    process.nextTick( async function() {

      let user = await User.findOne({ 'email':  email });
      if (user) {
        let errorObj = [{param: "signup", msg: `That email is already taken.`}];
        return done(null, false, req.flash('errors', JSON.stringify(errorObj)));
      } else {
        if( ! (req.body.password_confirm == password)) {
          let errorObj = [{param: "signup", msg: "The passwords doesn't match"}];
          return done(null, false, req.flash('errors', JSON.stringify(errorObj)));
        }
        var newUser = new User();
        
        newUser.email = email;
        newUser.name = req.body.name;
        newUser.surname = req.body.surname;
        newUser.passaport_id = req.body.passaport_id;
        if( req.body.algo_address && req.body.algo_mnemonic ) {
          newUser.algo_address = req.body.algo_address;
          newUser.algo_mnemonic = req.body.algo_mnemonic;
        } else {
          let { address, mnemonic } = algo.create_algo_address();
          newUser.algo_address = address;
          newUser.algo_mnemonic = mnemonic;
        }
        
        newUser.role = req.body.role;
        newUser.password = newUser.generateHash(password);
        newUser.save(function(err) {
          if (err)
            throw err;
          return done(null, newUser);
        });
      }

    });
  }));

  passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  },
  function(req, email, password, done) {
    console.log(`Logging ${email} with ${password}`)
    User.findOne({ 'email':  email }, function(err, user) {

      if (err){
        console.log( err );
        return done(err);
      }
      if (!user){
        let errorObj = [{param: "login", msg: "Wrong email or password"}];
        return done(null, false, req.flash('errors', JSON.stringify(errorObj)));
      }
          
      if (!user.validPassword(password)){
        let errorObj = [{param: "login", msg: "Wrong email or password"}];
        return done(null, false, req.flash('errors', JSON.stringify(errorObj)));
      }
          
      return done(null, user);
    });
  }));

  

};
