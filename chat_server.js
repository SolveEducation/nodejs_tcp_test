let net = require('net');
let Chat = require('./analyze/Chat.js');

var clients = [];
var server = net.createServer(function(socket) {
    if(clients.indexOf(socket)===-1){
        clients.push(socket);
    }
    // Handle incoming messages from clients.
    socket.on('data', function (data) {
        data = data.toString();
        data = JSON.parse(data);
        if(data.action==="chat"){
            let chat_obj = new Chat(socket,data,broadcast);
        }
        let memory = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`The script uses approximately ${memory} MB`);
    });

    // Remove the client from the list when it leaves
    socket.on('end', function () {
        let index_user_leaving = clients.indexOf(socket);
        delete clients[index_user_leaving];
        broadcast(socket.name + " left the chat.");
    });

    // Send a message to all clients
    function broadcast(message, sender) {
        clients.forEach(function (client) {
            // Don't want to send it to sender
            if (client === sender) return;
            client.write(message);
        });
        // Log it to the server output too
        process.stdout.write(message)
    }
});

server.listen(1337);


