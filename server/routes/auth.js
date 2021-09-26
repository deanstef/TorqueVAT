
var express = require('express');
var passport = require('passport');
var router = express.Router();
var { checkFlashValidation } = require('../middleware/validator.check');
var {body} = require('express-validator');

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});
router.get('/login', function(req, res) {
    res.render('login');
});
router.get('/signup', function(req, res) {
    res.render('signup');
});
router.get('/signup/merchant', function(req, res) {
    res.render('signup-merchant');
});

router.post('/signup/merchant', 
    body('name').exists().notEmpty().isString().isLength({max: 20}).trim().escape(),
    body('surname').exists().notEmpty().isString().isLength({max: 20}).trim().escape(),
    body('email').exists().notEmpty().isEmail().trim().escape(),
    body('algo_address').exists().notEmpty().isEmail().trim().escape(),
    body('algo_mnemonic').exists().notEmpty().isEmail().trim().escape(),
    body('password').exists().notEmpty().isString().trim().escape(),
    body('password_confirm').exists().notEmpty().isString().trim().escape(),
    (req, res, next) => { req.body.role = "MERCHANT"; next(); },
    passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/auth/signup/merchant',
    failureFlash: true,
}));

router.post('/signup', 
    body('name').exists().notEmpty().isString().isLength({max: 20}).trim().escape(),
    body('surname').exists().notEmpty().isString().isLength({max: 20}).trim().escape(),
    body('email').exists().notEmpty().isEmail().trim().escape(),
    body('algo_address').exists().notEmpty().isEmail().trim().escape(),
    body('algo_mnemonic').exists().notEmpty().isEmail().trim().escape(),
    body('password').exists().notEmpty().isString().trim().escape(),
    body('password_confirm').exists().notEmpty().isString().trim().escape(),
    (req, res, next) => { req.body.role = "USER"; next(); },
    passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/auth/signup/',
    failureFlash: true,
}));

router.post('/login', passport.authenticate('local-login', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true,
}));

module.exports = router;