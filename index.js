var mysql = require('mysql');
var net = require('net');

var con = mysql.createConnection({
    host: "localhost",
    user: "citygame",
    password: "citypass",
    database: "citygame"
});
/*
con.query("SELECT * FROM DB_Login WHERE User_ID=488", function (err, result, fields) {
    console.log(result);
});
*/

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

con.connect();
/*
con.query("SELECT * FROM DB_Login WHERE User_ID=488", function (err, result, fields) {
    console.log(result);
});
*/
var clients = [];
var chat_mate = [];

var server = net.createServer(function(socket) {
    // Handle incoming messages from clients.
    socket.on('data', function (data) {
        if(clients.indexOf(socket)===-1){
            // Put this new client in the list
            socket.name = data.toString();
            clients.push(socket);

            // Send a nice welcome message and announce
            socket.write("Welcome " + socket.name);
            socket.write("Type 'all' to show all of the users and 'chatto <name> to chat to a specific user'");
            broadcast(socket.name + " joined the chat\n", socket);
        }else{
            //find the chatmate
            let index_current = clients.indexOf(socket);
            let data_string = data.toString();
            if(data_string.startsWith("chatto")){
                let index_chatmate = -1;
                let target_user = data_string.replace("chatto","").trim();
                console.log(target_user);
                clients.forEach(function(client,idx){
                    if(client.name===target_user){
                        index_chatmate = idx;
                    }
                });
                if(index_chatmate===-1){
                    socket.write("user " + target_user + " is not found\n");
                }else{
                    if(typeof (chat_mate[index_current]) !== "undefined"){
                        clients[chat_mate[index_current]].write(clients[index_current].name + " is leaving the conversation");
                    }

                    if(typeof (chat_mate[index_chatmate]) !== "undefined"){
                        clients[chat_mate[index_chatmate]].write(clients[index_chatmate].name + " is leaving the conversation");
                    }

                    clients[index_chatmate].write("Currently you are chatting with "+clients[index_current].name);
                    chat_mate[index_current] = index_chatmate;
                    chat_mate[index_chatmate] = index_current;
                }
            }else if(data_string=="all"){
                clients.forEach(function(client){
                    socket.write(client.name);
                });
            }else{
                if(typeof (chat_mate[index_current])==="undefined"){
                    socket.write("You don't have any chatmate. Type 'all' to get the list of online users and 'chatto <name> to chat to a specific user'");
                }else{
                    let current_user_name = clients[index_current].name;
                    clients[chat_mate[index_current]].write(current_user_name + " > " + data.toString());
                }
            }
        }

        let memory = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`The script uses approximately ${memory} MB`);
    });

    // Remove the client from the list when it leaves
    socket.on('end', function () {
        let index_user_leaving = clients.indexOf(socket);
        if(index_user_leaving!==-1){
            delete clients[index_user_leaving];
            delete chat_mate[chat_mate[index_user_leaving]];
            delete chat_mate[index_user_leaving];
        }
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


