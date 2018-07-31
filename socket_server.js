let net = require('net');
let getCurrentID = require('./library/getCurrentID');
let getSession = require('./library/getSession');
let checkParameter = require('./library/checkParameter');

let response = {
    "type": "response",
    "done": 0,
    "message": ""
};

function socket_server(ontology) {
    let clients = [];
    let chat_list = {
        'waiting_users': [],
        'active_chat': []
    };

    let DB_Login = ontology.collections.db_login;

    setTimeout(function () {
        let background_process = require('./background_process');
        background_process(ontology, clients);
    }, 0);


    let server = net.createServer(function (socket) {
        // Handle incoming messages from clients.
        socket.on('data', function (data) {
            let data_from_client = data.toString();
            data_from_client = data_from_client.trim();
            data_from_client = data_from_client.replace(/\0/g, '');
            try {
                try {
                    data_from_client = JSON.parse(data_from_client);
                } catch (e) {
                    data_from_client = JSON.parse('{"' + decodeURI(data_from_client.replace(/&/g, "\",\"").replace(/=/g, "\":\"")) + '"}')
                }
                let current_id = getCurrentID(socket, clients);
                console.log(current_id);
                (async () => {
                    if (current_id === false) {
                        if (data_from_client.module === "auth") {
                            if (data_from_client.type === "login") {
                                let user = undefined;
                                let check_UNAP = checkParameter(data_from_client, ["email","password"]);
                                let check_service = checkParameter(data_from_client, ["service_id"]);
                                if(check_service !== "" && check_UNAP !== ""){
                                    socket.write(JSON.stringify({
                                        module: 'auth',
                                        type: 'login',
                                        done: 0,
                                        message: "Parameter(s) are incomplete : "+ (check_UNAP==="" ? check_service : check_UNAP)
                                    }));
                                    return;
                                }

                                if ("service_id" in data_from_client) {
                                    user = await DB_Login.findOne({User_Service_ID: data_from_client.service_id});
                                } else {
                                    user = await DB_Login.findOne({
                                        User_Email: data_from_client.email,
                                        User_Password: data_from_client.password
                                    });
                                }
                                if (typeof user === "undefined") {
                                    //auth failed
                                    socket.write(JSON.stringify({
                                        module: 'auth',
                                        type: 'login',
                                        done: 0,
                                        message: "Authentication failed"
                                    }));
                                } else {
                                    //auth success
                                    if (getSession(user.User_ID, clients)) {
                                        socket.write(JSON.stringify({
                                            module: 'auth',
                                            type: 'login',
                                            done: -1,
                                            message: "User is already authenticated"
                                        }));
                                    } else {
                                        socket.user_detail = user;
                                        clients.push(socket);
                                        socket.write(JSON.stringify({
                                            module: 'auth',
                                            type: 'login',
                                            done: 1,
                                            message: "User is authenticated"
                                        }));
                                    }
                                }
                            }else{
                                socket.write(JSON.stringify({
                                    module: 'auth',
                                    type: 'request',
                                    done: -1,
                                    message: "Request is invalid."
                                }));
                            }
                        } else {
                            //call is forbidden. Not authenticated yet
                            socket.write(JSON.stringify({
                                module: 'auth',
                                type: 'request',
                                done: -1,
                                message: "Request is Invalid. Need Authentication first"
                            }));
                        }
                    } else {
                        console.log(data_from_client);
                        if (data_from_client.module === "session") {
                            let Session = require('./types_handler/session');
                            Session(socket, ontology, clients, data_from_client);
                        } else if (data_from_client.module === "matchmaking") {
                            let Matchmaking = require('./types_handler/matchmaking');
                            Matchmaking(socket, ontology, clients, data_from_client);
                        } else if (data_from_client.module === "auth") {
                            if (data_from_client.type === "logout") {
                                let index_user_leaving = clients.indexOf(socket);
                                if (index_user_leaving !== -1) {
                                    delete clients[index_user_leaving];
                                    delete chat_list[chat_list[index_user_leaving]];
                                    delete chat_list[index_user_leaving];
                                    socket.write(JSON.stringify({
                                        module: 'auth',
                                        type: 'logout',
                                        done: 1,
                                        message: "You are logged out"
                                    }));
                                } else {
                                    socket.write(JSON.stringify({
                                        module: 'auth',
                                        type: 'logout',
                                        done: 0,
                                        message: "You haven't logged in yet"
                                    }));
                                }
                            } else {
                                socket.write(JSON.stringify({
                                    module: 'auth',
                                    type: 'logout',
                                    done: -1,
                                    message: "User is already authenticated. Please logout and re-login"
                                }));
                            }
                        } else {
                            socket.write(JSON.stringify({
                                module: 'auth',
                                type: 'request',
                                done: 0,
                                message: "Request is Invalid"
                            }));
                        }
                    }
                })().then(() => {

                }).catch((err) => {
                    console.error(err);
                });
            } catch (e) {
                response.message = "Error: " + e.toString();
                socket.write(JSON.stringify(response));
            }
        });

        // Remove the client from the list when it leaves
        socket.on('end', function () {
            //delete from clients
            let index_user_leaving = clients.indexOf(socket);
            if (index_user_leaving !== -1) {
                delete clients[index_user_leaving];
                delete chat_list[chat_list[index_user_leaving]];
                delete chat_list[index_user_leaving];
            }
            //delete from
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
