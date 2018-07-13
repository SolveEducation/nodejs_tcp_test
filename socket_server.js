let net = require('net');
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
    let DB_Game_Lounge = ontology.collections.db_game_lounge;
    let DB_Sessions = ontology.collections.db_sessions;

    setTimeout( function () {
        (async ()=>{
            while(true === true){
                let lounges = await DB_Game_Lounge.find({Status: 0});
                for(let lounge of lounges){
                    lounge = await DB_Game_Lounge.findOne({Record_KEY: lounge.Record_KEY});
                    //check for timeout
                    if(lounge.Time+ 60 < Math.floor(new Date().getTime()/1000)){
                        //then timeout
                        lounge.Data = JSON.stringify({
                            status : "timeout",
                            time : Math.floor(new Date().getTime()/1000)
                        });
                        lounge.Status = 2;
                        lounge = JSON.parse(JSON.stringify(lounge));
                        await DB_Game_Lounge.update({Record_KEY: lounge.Record_KEY}, lounge);
                    }else{
                        if(lounge.Status === 0){
                            let lounges_candidate = await DB_Game_Lounge.find({Status: 0, Game_ID: lounge.Game_ID, User_ID: { '!=': lounge.User_ID }});
                            if(lounges_candidate.length > 0){
                                let random_number = Math.floor(Math.random() * lounges_candidate.length);
                                let match = lounges_candidate[random_number];
                                //check is offline or not
                                let match_session = getSession(match.User_ID, clients);
                                let lounge_session = getSession(lounge.User_ID, clients);

                                if(match_session !== false && lounge_session !== false){

                                    //create a new game session
                                    let session = await DB_Sessions.create({
                                        Game_ID: lounge.Game_ID,
                                        Created_At: lounge.Time,
                                        Data: "",
                                    }).fetch();

                                    lounge.Data = JSON.stringify({
                                        status : "match",
                                        time : Math.floor(new Date().getTime()/1000),
                                        partner : match.User_ID
                                    });
                                    lounge.Status = 1;
                                    lounge.Session_ID = session.Session_ID;

                                    match.Data = JSON.stringify({
                                        status : "match",
                                        time : Math.floor(new Date().getTime()/1000),
                                        partner : lounge.User_ID
                                    });
                                    match.Status = 1;
                                    match.Session_ID = session.Session_ID;

                                    lounge = JSON.parse(JSON.stringify(lounge));
                                    match = JSON.parse(JSON.stringify(match));

                                    await DB_Game_Lounge.update({Record_KEY: match.Record_KEY}, match);
                                    await DB_Game_Lounge.update({Record_KEY: lounge.Record_KEY}, lounge);

                                }else{
                                    if(match_session === false){
                                        match.Data = JSON.stringify({
                                            status : "offline",
                                            time : Math.floor(new Date().getTime()/1000),
                                        });
                                        match.Status = 2;
                                        match = JSON.parse(JSON.stringify(match));
                                        await DB_Game_Lounge.update({Record_KEY: match.Record_KEY}, match);
                                    }
                                    if(lounge_session === false){
                                        lounge.Data = JSON.stringify({
                                            status : "offline",
                                            time : Math.floor(new Date().getTime()/1000),
                                        });
                                        lounge.Status = 2;
                                        lounge = JSON.parse(JSON.stringify(lounge));
                                        await DB_Game_Lounge.update({Record_KEY: lounge.Record_KEY}, lounge)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })().catch((err)=>{
            console.error(err);
        });
    }, 0 );



    let server = net.createServer(function (socket) {
        // Handle incoming messages from clients.
        socket.on('data', function (data) {
            let data_from_client = data.toString();
            console.log(data_from_client);
            data_from_client = data_from_client.trim();
            data_from_client = data_from_client.replace(/\0/g, '');
            try {
                data_from_client = JSON.parse(data_from_client);
                response.type = "auth";

                (async ()=>{
                    let user = await DB_Login.findOne({Record_KEY: data_from_client.user_id});
                    console.log(user);
                    if(typeof (user) === "undefined"){
                        response.message = "User not found";
                    }else{
                        socket.user_detail = user;
                        clients[user.User_ID] = socket;
                        if (data_from_client.type === "chat") {
                            let Chat = require('./types_handler/chat');
                            Chat(user, ontology, clients, data_from_client, response, chat_list);
                        }else if(data_from_client.type === "matchmaking"){
                            let Matchmaking = require('./types_handler/matchmaking');
                            Matchmaking(user, ontology, clients, data_from_client, response, chat_list);
                        }else{
                            response.type = "request";
                            response.message = "Request not found";
                            socket.write(JSON.stringify(response));
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
		console.log(JSON.stringify(response));
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
