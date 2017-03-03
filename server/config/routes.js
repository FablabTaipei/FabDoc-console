/**
 * Routes for express app
 */
var express = require('express');
var _ = require('lodash');
var uuid = require('node-uuid');
var path = require('path');
// var service = require('../services/service');
// var fs = require('fs');
// var uaparser = require('ua-parser-js');
// var compiled_app_module_path = path.resolve(__dirname, '../../', 'public', 'assets', 'server.js');
// var App = require(compiled_app_module_path);

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    if(process.env.NODE_ENV === 'development') return next();
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated()){
      console.log("is auth");
      return next();
    }
      
    console.log("return to login");
    // if they aren't redirect them to the home page
    res.redirect('/login');
} 

module.exports = function(app, passport) {

  // =====================================
  // Normal Files ========================
  // =====================================
  app.get('/client/:type(css|js|images)/:name', function(req, res, next) {
    var type = req.params.type;
    var name = req.params.name;
    res.sendFile(path.resolve(__dirname, '../../client', type, name));
  });

  // =====================================
  // API =================================
  // =====================================
  // app.get('/createshare/:name/:gift/:count/:line', function(req, res, next){
  //   var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  //   console.log("ip: " + ip);
  //   if(ip.search("127.0.0.1") >= 0 || ip.search("0.0.0.0") >= 0){
  //     res.render(path.resolve(__dirname, '../', 'views/bingo/createshare.ejs'), {
  //       name: decodeURIComponent(req.params.name),
  //       gift: req.params.gift == "0"? false : decodeURIComponent(req.params.gift),
  //       correctCount: req.params.count,
  //       lineCount: req.params.line
  //     } );
  //   }
  // });

  // =====================================
  // CONSOLE =============================
  // =====================================
  app.get('/', isLoggedIn, function (req, res, next) {
    res.render(path.resolve(__dirname, '../', 'views/index.ejs'));
  });
  // show the login form
  app.get('/login', function(req, res) {
      // render the page and pass in any flash data if it exists
      res.render(path.resolve(__dirname, '../', 'views/login.ejs'));
  });

  // app.get('/console/:type(question|gift|player)', isLoggedIn, function(req, res, next){
  //   var type = req.params.type;
  //   var convertType = type[0].toUpperCase() + type.slice(1);
  //   service['get' + convertType]().then(function(results){
  //     var data = {};
  //     data[type] = results;
  //     res.render(path.resolve(__dirname, '../', 'views/console/' + type + '.ejs'), data );
  //   });
  // });

  // CRUD
  // app.post('/console/:type(question|gift|player)/:action(add|update|remove)', isLoggedIn, function(req, res, next){
  //   var type = req.params.type;
  //   var action = req.params.action;
  //   convertType = type[0].toUpperCase() + type.slice(1);
  //   service[action + convertType](req.body).then(function(){ res.redirect('/console/' + type); });
  // });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
      successRedirect : '/', // redirect to the secure profile section
      failureRedirect : '/login', // redirect back to the signup page if there is an error
      failureFlash : false // allow flash messages
  }));

  app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
  });

};
