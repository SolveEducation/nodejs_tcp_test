let Waterline = require("waterline");
module.exports = function Chat(record, orm, clients, data_from_client, response, chat_list){
    response.type = "chat";
    if( data_from_client.request === "register" ){
        //find a new chat friend
        if(chat_list.waiting_users.indexOf(record.User_ID) === -1){
            chat_list.waiting_users.push(record.User_ID);
        }
        let match = find_chatmate(record.User_ID, chat_list);
        if (match !== false){
            let socket_chatmate = clients[match];
            console.log(socket_chatmate.user_detail);
            response.message = "You got a new chatmate!: " + socket_chatmate.user_detail.Chat_Name;
            response.status = "start";
            response.done = 1;
            clients[record.User_ID].write(JSON.stringify(response));

            response.message = "You got a new chatmate!: " + record.Chat_Name;
            response.status = "start";
            clients[socket_chatmate.user_detail.User_ID].write(JSON.stringify(response));
            /*
            //pop users from waiting list
            chat_list.waiting_users.splice(chat_list.waiting_users(record.User_ID),1);
            chat_list.waiting_users.splice(chat_list.waiting_users(socket_chatmate.user_detail.User_ID),1);

            chat_list.active_chat[socket_chatmate.user_detail.User_ID] = record.User_ID;
            chat_list.active_chat[record.User_ID] = socket_chatmate.user_detail.User_ID;
            */
        }else{
            response.message = "Waiting for a friend... Will inform you after we got a match for you, or re-send the request";
            response.status = "waiting";
            response.done = 1;
            clients[record.User_ID].write(JSON.stringify(response));
        }
        let memory = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`The script uses approximately ${memory} MB`);
    }else if( data_from_client.request === "chat" ){

    }


    function find_chatmate(user_id, chat_list){
        let local_chat_list = JSON.stringify(chat_list.waiting_users);
        local_chat_list = JSON.parse(local_chat_list);
        let index_of_me = local_chat_list.indexOf(user_id);
        local_chat_list.splice(index_of_me,1);

        if(local_chat_list.length >= 1){
            let random_user = Math.floor(Math.random() * index_of_me);
            return local_chat_list[random_user];
        }else{
            return false;
        }
    }

};