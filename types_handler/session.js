let getCurrentID = require("../library/getCurrentID");
let getSession = require("../library/getSession");
let checkParameter = require("../library/checkParameter");
module.exports = function (session, ontology, clients, data_from_client) {
    let DB_Game_Lounge = ontology.collections.db_game_lounge;
    let DB_Sessions = ontology.collections.db_sessions;
    let DB_Login = ontology.collections.db_login;
    let user_id = getCurrentID(session, clients);
    (async () => {
        let check_main_params =  checkParameter(data_from_client, ["session_id","type"]);
        if(check_main_params !== ""){
            session.write(JSON.stringify({
                module: data_from_client.module,
                type: data_from_client.type,
                done: 0,
                message: "Parameter(s) are incomplete : "+ check_main_params
            }));
            return;
        }
        let session_id = data_from_client.session_id;
        let query_session = {Session_ID: session_id};
        if(data_from_client.type !== "getData"){
            query_session.Status = 0
        }

        let sessions = await DB_Sessions.findOne(query_session).populate("Game_ID").populate("users");
        if(typeof sessions === "undefined"){
            session.write(JSON.stringify({
                module: data_from_client.module,
                type: data_from_client.type,
                done: "0",
                message: "Session is not found/valid",
            }));
            return;
        }

        if (data_from_client.type === "join") {
            //search is session exists or not
            let sessions = await DB_Sessions.findOne({Session_ID: session_id}).populate("Game_ID").populate("users");
            let users = await DB_Game_Lounge.find({Session_ID: session_id});
            let user_id = getCurrentID(session, clients);


            let old_user = false;
            for(let user of users){
                if(user.User_ID === user_id){
                    old_user = true;
                    if(user.Status===4){
                        user = JSON.parse(JSON.stringify(user));
                        await DB_Game_Lounge.update({Record_KEY: user.Record_KEY}, user);
                    }
                    break;
                }
            }
            let message_success = "Already on this session";
            if(old_user===false){
                //makes sure how many users on this session
                if(sessions.users.length >= sessions.Game_ID.Max_User_Per_Session){
                    session.write(JSON.stringify({
                        module: "session",
                        type: "join",
                        done: "0",
                        message: "Session is full",
                    }));
                    return 0;
                }
                //create a new user for this session
                await DB_Game_Lounge.create({
                    User_ID: user_id,
                    Game_ID: sessions.Game_ID.Game_ID,
                    Time: Math.floor(new Date().getTime()/1000),
                    Status: 1,
                    Session_ID: sessions.Session_ID,
                    Data: ''
                }).fetch();
                message_success = "Added to the session";
            }
            session.write(JSON.stringify({
                module: "session",
                type: "join",
                done: "1",
                session_id: sessions.Session_ID,
                message: message_success,
            }));

        } else if (data_from_client.type === "players") {
            let check_params =  checkParameter(data_from_client, ["session_id"]);
            if(check_params !== ""){
                session.write(JSON.stringify({
                    module: 'session',
                    type: 'players',
                    done: 0,
                    message: "Parameter(s) are incomplete : "+ check_params
                }));
                return;
            }
            let session_id = data_from_client.session_id;
            let sessions = await DB_Sessions.findOne({Session_ID: session_id}).populate("users");
            let user_sessions = await DB_Game_Lounge.count({User_ID: user_id, Session_ID: session_id});

            if(user_sessions === 0){
                session.write(JSON.stringify({
                    module: "session",
                    type: "players",
                    done: 0,
                    message: "Not a user from this session",
                }));
                return 0;
            }
            if(typeof sessions !== "undefined"){
                let list_of_players = [];
                console.log(sessions.users);
                for (let user of sessions.users){
                    let user_detail =  await DB_Login.findOne({User_ID: user.User_ID});
                    let user_session = getSession(user.User_ID, clients);
                    list_of_players.push({
                        User_ID : user.User_ID,
                        Status : user.Status,
                        Online_Status : user_session!==false,
                        Chat_Name : user_detail.Chat_Name,
                        User_Name : user_detail.User_Name
                    })
                }
                session.write(JSON.stringify({
                    module: "session",
                    type: "players",
                    done: 1,
                    message: "Session and users is found",
                    users : list_of_players
                }));
            }else{
                session.write(JSON.stringify({
                    module: "session",
                    type: "players",
                    done: "0",
                    message: "Session not found",
                }));
            }
        } else if (data_from_client.type === "getData") {
            let check_params =  checkParameter(data_from_client, ["session_id"]);
            if(check_params !== ""){
                session.write(JSON.stringify({
                    module: 'session',
                    type: 'getData',
                    done: 0,
                    message: "Parameter(s) are incomplete : "+ check_params
                }));
                return;
            }
            let session_id = data_from_client.session_id;
            let sessions = await DB_Sessions.findOne({Session_ID: session_id}).populate("users");

            let user_sessions = await DB_Game_Lounge.count({User_ID: user_id, Session_ID: session_id});
            if(user_sessions === 0){
                session.write(JSON.stringify({
                    module: "session",
                    type: "getData",
                    done: 0,
                    message: "Not a user from this session",
                }));
                return 0;
            }

            if(typeof sessions !== "undefined"){
                let list_of_players = [];
                console.log(sessions.users);
                for (let user of sessions.users){
                    let user_session = getSession(user.User_ID, clients);
                    list_of_players.push({
                        User_ID : user.User_ID,
                        Data : JSON.parse(user.Data).data,
                        Online_Status : user_session!==false,
                    })
                }
                session.write(JSON.stringify({
                    module: "session",
                    type: "getData",
                    done: 1,
                    message: "Session and users is found",
                    sessionData: sessions.Data,
                    userData : list_of_players
                }));
            }else{
                session.write(JSON.stringify({
                    module: "session",
                    type: "getData",
                    done: "0",
                    message: "Session not found",
                }));
            }
        } else if (data_from_client.type === "setData") {
            let check_params =  checkParameter(data_from_client, ["session_id", "data", "dataType"]);
            if(check_params !== ""){
                session.write(JSON.stringify({
                    module: 'session',
                    type: 'setData',
                    done: 0,
                    message: "Parameter(s) are incomplete : "+ check_params
                }));
                return;
            }

            let session_id = data_from_client.session_id;
            let sessions = await DB_Sessions.findOne({Session_ID: session_id}).populate("users");

            let user_sessions = await DB_Game_Lounge.count({User_ID: user_id, Session_ID: session_id});
            if(user_sessions === 0){
                session.write(JSON.stringify({
                    module: "session",
                    type: "setData",
                    done: 0,
                    message: "Not a user from this session",
                }));
                return 0;
            }

            if(typeof sessions !== "undefined"){
                //add the data
                let dataType = data_from_client.dataType;
                if(dataType==="session"){
                    await DB_Sessions.update({Session_ID: sessions.Session_ID}, {Data: data_from_client.data});
                }else if(dataType==="status"){
                    await DB_Sessions.update({Session_ID: sessions.Session_ID}, {Status: parseInt(data_from_client.data)});
                }else{
                    //find the record key
                    let current_id = getCurrentID(session, clients);
                    for(let user of sessions.users){
                        if(user.User_ID === current_id) {
                            let data_client = JSON.parse(user.Data);
                            data_client.data = data_from_client.data;
                            await DB_Game_Lounge.update({Record_KEY: user.Record_KEY}, {Data: JSON.stringify(data_client)});
                            break;
                        }
                    }
                }
                sessions = await DB_Sessions.findOne({Session_ID: session_id}).populate("users");
                let list_of_players = [];
                let list_of_sessions = [];
                for (let user of sessions.users){
                    let user_session = getSession(user.User_ID, clients);
                    list_of_players.push({
                        User_ID : user.User_ID,
                        Data : JSON.parse(user.Data).data,
                        Online_Status : user_session!==false,
                    });
                    if(user_session !== false){
                        list_of_sessions.push(user_session);
                    }
                }

                for(let session_group of list_of_sessions){
                    session_group.write(JSON.stringify({
                        module: "session",
                        type: "setData",
                        done: 1,
                        message: "Session and users is found",
                        sessionData: sessions.Data,
                        userData : list_of_players
                    }));
                }
            }else{
                session.write(JSON.stringify({
                    module: "session",
                    type: "setData",
                    done: "0",
                    message: "Session not found",
                }));
            }
        }
    })().catch((err) => {
        console.error(err);
    });
};