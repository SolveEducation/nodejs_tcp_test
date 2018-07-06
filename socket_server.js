let net = require('net');
let Waterline = require('waterline');
let response = {
    "type": "response",
    "done": 0,
    "message": ""
};

function socket_server(orm) {
    let clients = [];
    let chat_list = {
        'waiting_users' : [],
        'active_chat' : []
    };

    let server = net.createServer(function (socket) {
        // Handle incoming messages from clients.
        socket.on('data', function (data) {
            let data_from_client = data.toString();
            try {
                data_from_client = JSON.parse(data_from_client);
                response.type = "auth";
                Waterline.getModel('db_login', orm).findOne({Record_KEY: data_from_client.user_id},
                    function (err, record) {
                        if (err) {
                            response.message = "Error on authenticating "+ err.toString();
                            socket.write(JSON.stringify(response));
                        } else {
                            if (record == null) {
                                response.message = "User not found";
                                socket.write(JSON.stringify(response));
                            } else {
                                //save this users to client list
                                socket.user_detail = record;
                                clients[record.User_ID] = socket;
                                if(data_from_client.type === "chat") {
                                    let Chat = require('./types_handler/chat');
                                    Chat(record, orm, clients, data_from_client, response, chat_list);
                                }else{
                                    response.type = "request";
                                    response.message = "Request not found";
                                    socket.write(JSON.stringify(response));
                                }
                            }
                        }
                    });

            } catch (e) {
                response.message = "Error: " + e.toString();
                socket.write(JSON.stringify(response));
            }
        });

        // Remove the client from the list when it leaves
        socket.on('end', function () {
            broadcast("Someone left the chat.");
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
}

module.exports = socket_server;