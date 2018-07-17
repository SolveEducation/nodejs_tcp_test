let getCurrentID = require("../library/getCurrentID");
let getSession = require("../library/getSession");
module.exports = function (session, ontology, clients, data_from_client) {
    let DB_Game_Lounge = ontology.collections.db_game_lounge;
    let DB_Sessions = ontology.collections.db_sessions;
    let DB_Login = ontology.collections.db_login;
    let user_id = getCurrentID(session, clients);
    (async () => {
        if (data_from_client.type === "join") {

            let session_id = data_from_client.session_id;
            //search is session exists or not
            let sessions = await DB_Sessions.findOne({Session_ID: session_id});
            let users = await DB_Game_Lounge.find({Session_ID: session_id});
            let user_id = getCurrentID(session, clients);

            if (typeof sessions === "undefined") {
                session.write(JSON.stringify({
                    module: "session",
                    type: "join",
                    done: "0",
                    message: "Session not found",
                }));
            } else {
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

                if(old_user===false){
                    //create a new user for this session
                    await DB_Game_Lounge.create({
                        User_ID: user_id,
                        Game_ID: sessions.Game_ID,
                        Time: Math.floor(new Date().getTime()/1000),
                        Status: 1,
                        Session_ID: sessions.Session_ID,
                        Data: ''
                    }).fetch();
                }
                session.write(JSON.stringify({
                    module: "session",
                    type: "join",
                    done: "1",
                    session_id: sessions.Session_ID,
                    message: "Added to the session",
                }));
            }
        } else if (data_from_client.type === "players") {
            let session_id = data_from_client.session_id;
            let sessions = await DB_Sessions.findOne({Session_ID: session_id}).populate("users");
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
            let session_id = data_from_client.session_id;
            let sessions = await DB_Sessions.findOne({Session_ID: session_id}).populate("users");
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
            let session_id = data_from_client.session_id;
            let sessions = await DB_Sessions.findOne({Session_ID: session_id}).populate("users");

            if(typeof sessions !== "undefined"){
                //add the data
                let dataType = data_from_client.dataType;
                if(dataType==="session"){
                    await DB_Sessions.update({Session_ID: sessions.Session_ID}, {Data: data_from_client.data});
                }else{
                    //find the record key
                    let current_id = getCurrentID(session, clients);
                    for(let user of sessions.users){
                        if(user.User_ID === current_id){
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