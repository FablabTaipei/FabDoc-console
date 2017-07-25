/**
 * Routes for express app
 */
var express = require('express');
var _ = require('lodash');
var uuid = require('node-uuid');
var path = require('path');
var utils = require('../utils');
var interface = require('../services/data-interface');

var isDev = process.env.NODE_ENV === 'development';

// var service = require('../services/service');
// var fs = require('fs');
// var uaparser = require('ua-parser-js');
// var compiled_app_module_path = path.resolve(__dirname, '../../', 'public', 'assets', 'server.js');
// var App = require(compiled_app_module_path);

function checkAndUpdateCookie(req, res){
    var updateCookieValue = utils.getCookie(req),
    hasExist = !!updateCookieValue;

    if(!updateCookieValue) updateCookieValue = uuid.v4();

    utils.setCookie(res, updateCookieValue, 1000 * 60 * 60 * 3); // 3 hrs

    // return hasExist;
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    function toNext(){
        // console.log("is auth");
        checkAndUpdateCookie(req, res);
        return next();
    }
    // if user is authenticated in the session, carry on
    // if(process.env.NODE_ENV === 'development' || req.isAuthenticated()) return toNext();
    if(req.isAuthenticated()) return toNext();

    console.log("return to login");
    // if they aren't redirect them to the home page
    res.redirect('/login');
}

module.exports = function(app, passport) {

    // =====================================
    // Normal Files ========================
    // =====================================
    app.get('/client/:type(css|js|images|fonts)/:name', function(req, res, next) {
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

    app.get('/create/project', isLoggedIn, function (req, res, next) {
        res.render(path.resolve(__dirname, '../', 'views/createProject.ejs'));
        // req.session.project = 1;
    });

    app.post('/create/project/add', isLoggedIn, function(req, res, next){
        var formbody = req.body;
        var userId = req.user;

        interface.addProject(formbody.projectName, userId, formbody.description, formbody.license)
            .then(
                function(result){
                    req.session.project = parseInt(result.id);
                    // console.log(result);
                    res.redirect('/precommit')
                    // res.status(200).send("OK");
                },
                function(err){
                    res.status(500).json({error: "Internal server error: " + err});
                }
            );
    });

    app.get('/projects', isLoggedIn, function (req, res, next) {
        interface.getProjects(req.user)
            .then(
                function(results){ 
                    res.render(path.resolve(__dirname, '../', 'views/projectList.ejs'), { itemsStr: JSON.stringify(results) } ); 
                },
                function(err){ res.status(500).json({error: "Internal server error: " + err}); }
            );        
    });

    app.get('/precommit', isLoggedIn, function (req, res, next) {
        res.render(path.resolve(__dirname, '../', 'views/precommit.ejs'));
    });

    app.post('/addcommit', isLoggedIn, function(req, res, next){
        var userId = req.user;
        var projectId = req.session.project;
        if(projectId && user){
            // ...
        }
    });


    if(isDev){
        // =====================================
        // TEST FIREBASE =======================
        // =====================================
        app.get('/testpush', isLoggedIn, function (req, res, next) {
            req.session.project = 1;
            res.render(path.resolve(__dirname, '../', 'views/testpush.ejs'), 
                { 
                    base64: utils.base64_encode( path.resolve(__dirname, '../../', 'client/images/flower.jpg') ),
                    filename: "flower.jpg",
                    type: "image/jpg"
                }
            );
        });
        app.post('/testpush/commit/add', isLoggedIn, function (req, res, next) {
            var projectId = req.session.project || 1;
            var userId = req.user;
            var formbody = req.body;
            var image = null;

            if(formbody.filename){
                image = {
                    filename: formbody.filename,
                    base64String: formbody.base64String,
                    mediaType: formbody.mediaType
                }
            }

            interface.addCommit({
                project_id: projectId,
                user_id: userId,
                message: formbody.message,
                components: JSON.stringify( [{ name: "hook", quantity: 2, point:[23, 25, 100, 200] }, { name: "hamer", quantity: 1, point:[66, 45, 150, 40] }] ),
                machines: JSON.stringify(['shit','damn']),
                repos: "https://github.com/FablabTaipei/FabDoc-RPi-client",
                note: "this is a test",
                image: image
            }).then(function(result){
                // console.log(result);
                res.status(200).send("OK");
            }, function(err){
                res.status(500).json({error: "Internal server error: " + err});
            });

        });
        app.post('/testpush/project/add', isLoggedIn, function(req, res, next){
            var formbody = req.body;
            var userId = req.user;

            interface.addProject(formbody.name, userId, formbody.description, formbody.license)
                .then(
                    function(result){
                        console.log(result);
                        res.status(200).send("OK");
                    },
                    function(err){
                        res.status(500).json({error: "Internal server error: " + err});
                    }
                );
        });
    }
    
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
