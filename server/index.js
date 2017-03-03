var express = require('express');
// var fs = require('fs');
// var Db = require("./config/initializers/database.js")
// var secrets = require('./config/secrets');
// var webpack = require('webpack');
var app = express();
var http = require('http');
var passport = require('passport');
// var job = require('./services/mailer');
// Db.initialisation();

// Bootstrap models
// fs.readdirSync(__dirname + '/models').forEach(function(file) {
//   if(~file.indexOf('.js')) require(__dirname + '/models/' + file);
// });

var isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  // var config = require('../webpack/webpack.config.dev-client.js');
  // var compiler = webpack(config);
  // app.use(require('webpack-dev-middleware')(compiler, {
  //   noInfo: true,
  //   publicPath: config.output.publicPath
  // }));

  // app.use(require('webpack-hot-middleware')(compiler));
}

require('./config/passport')(passport); // pass passport for configuration

// Bootstrap application settings
require('./config/express')(app, passport);

// Bootstrap routes
require('./config/routes')(app, passport);

// Bootstrap routes
// require('./config/locales')(app);

var server = http.createServer(app).listen(app.get('port'));

// socket init
var environment = require('./config/environment.js');
var io = environment.loadSocketIo(server);
environment.authorize(io);
