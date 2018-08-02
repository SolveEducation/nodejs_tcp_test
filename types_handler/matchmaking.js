let getCurrentID = require('../library/getCurrentID');
let getSessions = require('../library/getSession');
let checkParameter = require('../library/checkParameter');
module.exports = function (session, ontology, clients, data_from_client) {
    let DB_Game_Lounge = ontology.collections.db_game_lounge;
    let DB_Async_Games = ontology.collections.db_async_games;

    if (data_from_client.type === "findgame") {
        let user_id = getCurrentID(session, clients);
        let game_id = data_from_client.gameid;
        (async () => {
            let check_params =  checkParameter(data_from_client, ["gameid"]);
            if(check_params !== ""){
                session.write(JSON.stringify({
                    module: data_from_client.module,
                    type: data_from_client.type,
                    done: 0,
                    message: "Parameter(s) are incomplete : "+ check_params
                }));
                return;
            }
            //check if there is any user in lounge
            let game = await DB_Async_Games.find({Game_ID : game_id});
            if(game.length === 0){
                session.write(JSON.stringify({
                    module: data_from_client.module,
                    type: data_from_client.type,
                    done: 0,
                    message: "Game ID is not valid"
                }));
                return;
            }


            if (user_id !== false) {
                //DB_Game_Lounge
                let lounge = await DB_Game_Lounge.findOne({Game_ID: game_id, User_ID: user_id, Status: 0});
                if (typeof(lounge) === "undefined") {
                    lounge = await DB_Game_Lounge.create({
                        User_ID: user_id,
                        Game_ID: game_id,
                        Time: Math.floor(new Date().getTime() / 1000),
                        Status: 0,
                        Data: ''
                    }).fetch();

                    session.write(JSON.stringify({
                        "module": "matchmaking",
                        "type": "request",
                        "message": "New request is created",
                        "done": 1,
                        "wlid": lounge.Record_KEY
                    }));
                } else {
                    session.write(JSON.stringify({
                        "module": "matchmaking",
                        "type": "request",
                        "message": "Already requested",
                        "done": 1,
                        "wlid": lounge.Record_KEY
                    }));
                }

            } else {
                session.write(JSON.stringify({
                    "type": "auth",
                    "message": "not a valid user",
                    "done": 0
                }));
            }
        })().catch((err) => {
            console.error(err);
        });
    } else if (data_from_client.type === "makegamewith") {
        let check_params =  checkParameter(data_from_client, ["gameid","user_group"]);
        if(check_params !== ""){
            session.write(JSON.stringify({
                module: 'session',
                type: 'setData',
                done: 0,
                message: "Parameter(s) are incomplete : "+ check_params
            }));
            return;
        }
        let user_id = getCurrentID(session, clients);
        let group_user = data_from_client.user_group;
        let game_id = data_from_client.gameid;

        //check users from group user
        let not_found = false;
        let list_of_sessions = [];
        group_user = group_user.split(",");
        if (group_user.indexOf(user_id) === -1) {
            group_user.push(user_id);
        }

        let inactive_users = [];
        for (let user of group_user) {
            let the_session = getSessions(user, clients);
            if (the_session === false) {
                not_found = true;
                inactive_users.push(user);
            }
        }

        if (not_found === true) {
            //request invalid
            session.write(JSON.stringify({
                "module": "module",
                "type": "makegamewith",
                "done": 0,
                "message": "Those users are inactive: " + inactive_users.join(", ")
            }));
        } else {
            let DB_Game_Lounge = ontology.collections.db_game_lounge;
            let DB_Sessions = ontology.collections.db_sessions;
            //create a session
            (async () => {
                let time = Math.floor(new Date().getTime() / 1000);
                let session = await DB_Sessions.create({
                    Game_ID: game_id,
                    Created_At: time,
                    Data: "",
                }).fetch();

                for (let user of group_user) {
                    let the_session = getSessions(user, clients);
                    if (the_session !== false) {
                        let lounge = await DB_Game_Lounge.create({
                            User_ID: user,
                            Game_ID: game_id,
                            Time: time,
                            Status: 1,
                            Data: JSON.stringify({
                                status : "start",
                                time : time,
                                data : ""
                            }),
                            Session_ID: session.Session_ID
                        }).fetch();

                        the_session.write(JSON.stringify({
                            "module": "module",
                            "type": "makegamewith",
                            "done": 1,
                            "session_id": session.Session_ID,
                            "message": "You've added to a session"
                        }));
                    }
                }

            })().catch((err) => {
                console.error(err);
            });
        }
    }
};
