var { validationResult } = require('express-validator');

function checkJsonValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        let errorsArr = errors.array();
        return res.send(400, JSON.stringify({errors: errorsArr}));
    }
    next();
}
function filterErrors(errorsArr){
    let errorsObj = [];
    let alreadyPresentKeys = [];
    for( let error of errorsArr ){
        let param = error.param;
        if(!alreadyPresentKeys.includes(param)){
            if( param == 'h-captcha-response' ) {
                if( error.msg.toLowerCase() == "invalid value" ) error.msg = "Please fill the captcha";
            }
            errorsObj.push(error);
            alreadyPresentKeys.push(param)
        }
    }
    return errorsObj;

}
function checkFlashValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        let errorsArr = errors.array();
        req.flash("errors", JSON.stringify(filterErrors(errorsArr)));
        let url = req.originalUrl;
        if( url == '/tokens/promote' ) url = '/';
        if( url == '/tokens/promote' ) url = '/';
        if( url == '/promotions/promote' ) url = '/admins/';
        if( req.body.redirect ) url = req.body.redirect;
        return res.redirect( url );
    }
    next();
}

module.exports = {
    checkJsonValidation: checkJsonValidation,
    checkFlashValidation: checkFlashValidation
}