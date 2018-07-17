let net = require('net');
let getCurrentID = require('./library/getCurrentID');
let getSession = require('./library/getSession');

let response = {
    "type": "response",
    "done": 0,
    "message": ""
};

function socket_server(ontology) {
    let clients = [];
    let chat_list = {
        'waiting_users' : [],
        'active_chat' : []
    };

    let DB_Login = ontology.collections.db_login;

    setTimeout( function () {
        let background_process = require('./background_process');
        background_process(ontology, clients);
    }, 0 );



    let server = net.createServer(function (socket) {
        // Handle incoming messages from clients.
        socket.on('data', function (data) {
            let data_from_client = data.toString();
            data_from_client = data_from_client.trim();
            data_from_client = data_from_client.replace(/\0/g, '');
            try {
                try{
                    data_from_client = JSON.parse(data_from_client);
                }catch (e) {
                    data_from_client = JSON.parse('{"' + decodeURI(data_from_client.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}')
                }
                let current_id = getCurrentID(socket,clients);
                (async ()=>{
                    if(current_id === false ){
                        if(data_from_client.module === "auth"){
                            let user = undefined;
                            if("service_id" in data_from_client){
                                user = await DB_Login.findOne({User_Service_ID: data_from_client.service_id});
                            }else{
                                user = await DB_Login.findOne({User_Email: data_from_client.email, User_Password: data_from_client.password });
                            }
                            if(typeof user==="undefined"){
                                //auth failed
                                socket.write(JSON.stringify({
                                    type : 'auth',
                                    done: 0,
                                    Message : "Authentication failed"
                                }));
                            }else{
                                //auth success
                                if(getSession(user.User_ID,clients)){
                                    socket.write(JSON.stringify({
                                        module : 'auth',
                                        type : 'auth',
                                        done: -1,
                                        Message : "User is already authenticated"
                                    }));
                                }else{
                                    socket.user_detail = user;
                                    clients.push(socket);
                                    socket.write(JSON.stringify({
                                        module : 'auth',
                                        type : 'auth',
                                        done: 1,
                                        Message : "User is authenticated"
                                    }));
                                }
                            }
                        }else{
                            //call is forbidden. Not authenticated yet
                            socket.write(JSON.stringify({
                                module : 'auth',
                                type : 'auth',
                                done: -1,
                                Message : "User is forbidden"
                            }));
                        }
                    }else{
                        console.log(data_from_client);
                        if (data_from_client.module === "session") {
                            let Session = require('./types_handler/session');
                            Session(socket, ontology, clients, data_from_client);
                        }else if(data_from_client.module === "matchmaking"){
                            let Matchmaking = require('./types_handler/matchmaking');
                            Matchmaking(socket, ontology, clients, data_from_client);
                        }else{
                            socket.write(JSON.stringify({
                                module : 'auth',
                                type : 'request',
                                done : 0,
                                message : "Request is Invalid"
                            }));
                        }
                    }
                })().then(()=>{

                }).catch((err)=>{
                    console.error(err);
                });
                /*
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
                                if (data_from_client.type === "chat") {
                                    let Chat = require('./types_handler/chat');
                                    Chat(record, orm, clients, data_from_client, response, chat_list);
                                }else if(data_from_client.type === "matchmaking"){
                                    let Matchmaking = require('./types_handler/matchmaking');
                                    Matchmaking(record, orm, clients, data_from_client, response, chat_list);
                                }else{
                                    response.type = "request";
                                    response.message = "Request not found";
                                    socket.write(JSON.stringify(response));
                                }
                            }
                        }
                    });
                */

            } catch (e) {
                response.message = "Error: " + e.toString();
                socket.write(JSON.stringify(response));
            }
        });

        // Remove the client from the list when it leaves
        socket.on('end', function () {
            //delete from clients
            let index_user_leaving = clients.indexOf(socket);
            if(index_user_leaving!==-1){
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
