function isAdmin(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/404');
    if( !req.user || !req.user.local || !req.user.local.admin ) return res.redirect('/404');
    return next();
}
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    let errorObj = [{param: "login", msg: "Please login"}];
    req.flash('errors', JSON.stringify(errorObj));
    res.redirect('/auth/login');
}

module.exports = {
    isAdmin,
    isLoggedIn
}