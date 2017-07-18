
var utils = require('../utils');

module.exports = {

    loadSocketIo: function loadSocketIo(server) {

        var io = require('socket.io').listen(server);

        io.on('connection', function (socket) {
            require('../controllers/socket.js')(socket,io);
        });

        return io;
    },

    authorize: function authorize(io) {
        io.use(function (socket, next) {
            var tokenRoom,
                params = utils.getParamPairs(socket.request);
            
            var isBrowser = utils.getCookie(socket.request);
            var isDevice = (tokenRoom = params["token"]) && io.sockets.adapter.rooms[tokenRoom];

            socket.isBrowser = isBrowser;
            socket.token = tokenRoom || utils.getToken();

            if( isBrowser || isDevice ){
                // browser open room or room exist
                console.log("OK");
                next();
            } else{
                console.log("Fail");
                next(new Error("Server reject this connection with token: " + tokenRoom));
            }
        });
    },
}
