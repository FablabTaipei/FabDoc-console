// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
var interface = require('../services/data-interface');
var uuid = require('node-uuid');
var utils = require('../utils');

// var users = {
//   account: {
//     username: 'account',
//     password: '12345678',
//     id: 1
//   }
// };

function checkAndUpdateCookie(req, res){
    var updateCookieValue = utils.getCookie(req);

    if(!updateCookieValue) updateCookieValue = uuid.v4();

    utils.setCookie(res, updateCookieValue, 1000 * 60 * 60 * 24 * 7); // 1 week
}

// check login user: https://gist.github.com/manjeshpv/84446e6aa5b3689e8b84
// https://github.com/manjeshpv/node-express-passport-mysql

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        done(null, id);
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with email and password from our form

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        // User.findOne({ 'local.email' :  email }, function(err, user) {
        //     // if there are any errors, return the error before anything else
        //     if (err)
        //         return done(err);

        //     // if no user is found, return the message
        //     if (!user)
        //         return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

        //     // if the user is found but the password is wrong
        //     if (!user.validPassword(password))
        //         return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

        //     // all is well, return successful user
        //     return done(null, user);
        // });

        interface.findUser(username, password).then(
            function(user){
                console.log("login user:" + user);
                checkAndUpdateCookie(req, req.res);
                done( null, user );
            },
            function(err){ return done( null, false, { message: err } ); }
        );

    }));
}; 