
// http://stackoverflow.com/questions/18831362/how-to-share-a-simple-image-on-facebook-with-callback

// var service = require('../services/service');

var webshot = require('webshot');

var path = require('path');

var isDev = process.env.NODE_ENV === 'development';

var _ = require('lodash');

// ===== for generate raw user/pass hash AND do MD5 hash =====
// function gen(user, pass){
//   var firstHash = "";
//   var o = {
//     long: "",
//     short: "",
//     setValues: function(a, b){
//       if(a.length > b.length){
//         this.long = a;
//         this.short = b;
//       }else{
//         this.long = b;
//         this.short = a;
//       }
//     }
//   };
//   // for fisrt hash
//   o.setValues(user, pass);
//   var longLen = o.long.length;
//   var shortLen = o.short.length;
//   var unit = Math.round(longLen / shortLen);
//   for(var idx = 0, len = shortLen; idx <= len; idx++){
//     firstHash += o.long.substr(idx * unit, unit);
//     if(idx != len) firstHash += o.short[idx];
//   }
//   // secondary hash
//   var left = firstHash.substring(0, firstHash.length / 2);
//   var right = firstHash.substring(firstHash.length / 2);
//   var leftHash = "", rightHash = "";
//   var leftLen = 0, rightLen = 0, leftMid = 0, rightMid = 0;
//   while( (leftLen = left.length) ){
//     leftMid = (leftLen % 2)? Math.floor(leftLen / 2) : (leftLen / 2);
//     leftHash += left[leftMid];
//     left = left.substring(0, leftMid) + left.substring(leftMid + 1);
//   }
//   while( (rightLen = right.length) ){
//     rightMid = (rightLen % 2)? Math.floor(rightLen / 2) : (rightLen / 2);
//     rightHash += right[rightMid];
//     right = right.substring(0, rightMid) + right.substring(rightMid + 1);
//   }
//   // return result
//   return leftHash + rightHash;
// }


module.exports = function (socket, io) {

  // var gameStatus = {};

  if(isDev){
    socket._cacheEmit = socket.emit;
    socket.emit = function(){
      socket._cacheEmit.apply(this, arguments);
    };
  }
  
  socket.on('req_start', function(message){
    
  });

  socket.on('req_next_block_question', function(){
    
  });

  socket.on('req_answer_question', function(message){
    
  });

  socket.on('req_check_blocks', function(){
    
  });

  socket.on('req_check_gift', function(){
    
  });

  socket.on('req_show_result', function(message){
    
  });

  socket.on('req_end', function(message){
    
  });

  socket.on('disconnect', function (message) {
    
  });

}


