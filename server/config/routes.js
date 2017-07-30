/**
 * Routes for express app
 */
var express = require('express');
var _ = require('lodash');
var path = require('path');
var utils = require('../utils');
var interface = require('../services/data-interface');

var isDev = process.env.NODE_ENV === 'development';

// var service = require('../services/service');
// var fs = require('fs');
// var uaparser = require('ua-parser-js');
// var compiled_app_module_path = path.resolve(__dirname, '../../', 'public', 'assets', 'server.js');
// var App = require(compiled_app_module_path);

// route middleware to make sure a user is logged in
function loginRequired(req, res, next) {
    // if user is authenticated in the session, carry on
    // if(process.env.NODE_ENV === 'development' || req.isAuthenticated()) return toNext();    
    if(req.isAuthenticated()) return next();

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
    app.get('/', function (req, res, next) {
        res.render(path.resolve(__dirname, '../', 'views/index.ejs'));
    });
    // show the login form
    app.get('/login', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render(path.resolve(__dirname, '../', 'views/login.ejs'));
    });

    app.get('/signup', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render(path.resolve(__dirname, '../', 'views/signup.ejs'), { message: req.flash('signupMessage') });
    });


    app.get('/create/project', loginRequired, function (req, res, next) {
        res.render(path.resolve(__dirname, '../', 'views/createProject.ejs'));
        // req.session.project = 1;
    });

    app.post('/create/project/add', loginRequired, function(req, res, next){
        var formbody = req.body;
        var userId = req.user;

        interface.addProject(formbody.projectName, userId, formbody.description, formbody.license)
            .then(
                function(result){
                    req.session.project = parseInt(result.id);
                    // console.log(result);
                    res.redirect('/project/' + result.id + '/precommit');
                    // res.status(200).send("OK");
                },
                function(err){
                    res.status(500).json({error: "Internal server error: " + err});
                }
            );
    });

    app.get('/project/:id/precommit', loginRequired, function (req, res, next) {
        res.render(path.resolve(__dirname, '../', 'views/precommit.ejs'), { project: req.params.id });
    });

    app.get('/project/:id/commits', function(req, res, next){
        var id = req.params.id;
        if(!id || isNaN(id)) res.status(404);
        else{
            interface.getCommits(parseInt(id))
                .then(
                    function(results){
                        // to return
                        var appendUrl = req.user? ("/project/" + id + "/precommit") : "";
                        res.render(path.resolve(__dirname, '../', 'views/commitList.ejs'), { itemsStr: JSON.stringify(results || []), appendUrl: appendUrl } );
                    },
                    function(err){ res.status(500).json({error: "Internal server error: " + err}); }
                );
        }
    });

    app.post('/project/:id/commits', loginRequired, function(req, res, next){
        var userId = req.user;
        var id = req.params.id;
        if(!id || isNaN(id)) res.status(404);
        else{
            var items = req.body;

            Promise.all(
                items.map(function(commit){
                    commit.project_id = id;
                    commit.user_id = userId;
                    return interface.addCommit(commit);
                })
            )
            .then(function(){ res.status(200).json({ status: "OK" }); })
            .catch(function(err){ res.status(500).json({error: "Internal server error: " + err}); });
        }
    });

    app.get('/projects', function (req, res, next) {
        res.render(path.resolve(__dirname, '../', 'views/projectList.ejs'), { getUrl: '/projects/json' } ); 
    });

    app.get('/projects/json', function (req, res, next) {
        var idx = req.query.idx;
        var len = req.query.len;
        interface.getAllProjects(idx, len)
            .then(
                function(results){
                    var userId = req.user;
                    if(userId) {    // if login
                        results.forEach(function(item){ 
                            if(item.user_id == userId) item.appendUrl = "/project/" + item.id + "/precommit";
                        });
                    }
                    res.status(200).json({ items: results });
                },
                function(err){ res.status(500).json({error: "Internal server error: " + err}); }
            );
    });

    app.get('/user/projects', loginRequired, function (req, res, next) {
        res.render(path.resolve(__dirname, '../', 'views/projectList.ejs'), { getUrl: '/user/projects/json' } ); 
    });

    app.get('/user/projects/json', loginRequired, function (req, res, next) {
        var idx = req.query.idx;
        var len = req.query.len;
        interface.getUserProjects(req.user, idx, len)
            .then(
                function(results){
                    var userId = req.user;
                    results.forEach(function(item){
                        if(item.user_id == userId) item.appendUrl = "/project/" + item.id + "/precommit";
                    });
                    res.status(200).json({ items: results });
                },
                function(err){ res.status(500).json({error: "Internal server error: " + err}); }
            );
    });

    if(isDev){
        // =====================================
        // TEST FIREBASE =======================
        // =====================================
        app.get('/testpush', loginRequired, function (req, res, next) {
            req.session.project = 1;
            res.render(path.resolve(__dirname, '../', 'views/testpush.ejs'),
                {
                    base64: utils.base64_encode( path.resolve(__dirname, '../../', 'client/images/flower.jpg') ),
                    filename: "flower.jpg",
                    type: "image/jpg"
                }
            );
        });
        app.post('/testpush/commit/add', loginRequired, function (req, res, next) {
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
        app.post('/testpush/project/add', loginRequired, function(req, res, next){
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
        app.get('/testpush/commits', loginRequired, function(req, res, next){

            interface.getCommits(req.session.project || 1)
                .then(
                    function(result){
                        res.status(200).json(result);
                    },
                    function(err){
                        res.status(500).json({error: "Internal server error: " + err});
                    }
                );
        });
    }

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : false // allow flash messages
    }));

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

};
