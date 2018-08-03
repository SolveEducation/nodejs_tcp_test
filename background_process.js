let getSession = require('./library/getSession');

module.exports = function (ontology, clients) {
    let DB_Game_Lounge = ontology.collections.db_game_lounge;
    let DB_Sessions = ontology.collections.db_sessions;
    function sleep(ms){
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }
    (async () => {
        //doing this process forever
        while (true === true) {
            let lounges = await DB_Game_Lounge.find({Status: 0}).populate("Game_ID");
            if(lounges.length===0){
                await sleep(7*1000);
                continue;
            }
            for (let lounge of lounges) {
                let lounge_session = getSession(lounge.User_ID, clients);
                lounge = await DB_Game_Lounge.findOne({Record_KEY: lounge.Record_KEY}).populate("Game_ID");
                //check for timeout
                if (lounge.Time + 15 < Math.floor(new Date().getTime() / 1000)) {
                    //if timeout and online, then create a new session with bot if it's okay
                    if(lounge.Game_ID.Allow_Bot === 1){
                        let min_user_per_session = lounge.Game_ID.Min_User_Per_Session;
                        let max_user_per_session = lounge.Game_ID.Max_User_Per_Session;
                        if(lounge_session===false){
                            lounge.Status = 2;
                            lounge.Data = JSON.stringify({
                                "status":"timeout",
                                "time": Math.floor(new Date().getTime() / 1000)
                            });
                            lounge = JSON.parse(JSON.stringify(lounge));
                            lounge.Game_ID = lounge.Game_ID.Game_ID;
                            await DB_Game_Lounge.update({Record_KEY: lounge.Record_KEY}, lounge);
                        }else{
                            //check bots
                            let sessions = await DB_Game_Lounge.find({
                                User_ID: lounge.User_ID
                            });

                            let sess = [];
                            for(let ses of sessions){
                                if(ses.Session_ID !== null){
                                    sess.push(ses.Session_ID);
                                }
                            }
                            sess = Array.from(new Set(sess));
                            console.log("List of sessions", sess);

                            let bots_to_replace = await DB_Game_Lounge.find({
                                Game_ID: lounge.Game_ID.Game_ID,
                                User_ID: null,
                                Session_ID: { '!=' : sess }
                            });

                            if(bots_to_replace.length > 0){
                                bots_to_replace = bots_to_replace[0];
                                console.log(bots_to_replace);
                                bots_to_replace.User_ID = lounge.User_ID;
                                bots_to_replace.Data = JSON.stringify({
                                    "status":"start",
                                    "time": Math.floor(new Date().getTime() / 1000),
                                    "data":""
                                });
                                bots_to_replace = JSON.parse(JSON.stringify(bots_to_replace));
                                await DB_Game_Lounge.update({Record_KEY: bots_to_replace.Record_KEY}, bots_to_replace);
                                await DB_Game_Lounge.destroy({Record_KEY: lounge.Record_KEY});
                                lounge_session.write(JSON.stringify({
                                    "module":"matchmaking",
                                    "type":"findgame",
                                    "session": bots_to_replace.Session_ID,
                                    "done":1
                                }));
                            }else{
                                //check minimum number, number of bots
                                let lounges_candidate = await DB_Game_Lounge.find({
                                    Status: 0,
                                    Game_ID: lounge.Game_ID.Game_ID,
                                    User_ID: {'!=': lounge.User_ID}
                                });

                                let users = [lounge];
                                lounges_candidate = lounges_candidate.sort(() => Math.random() - 0.5);
                                for (let candidate of lounges_candidate) {
                                    let session_candidate = getSession(candidate.User_ID, clients);
                                    if (session_candidate !== false) {
                                        users.push(candidate);
                                    }
                                    if (users.length >= max_user_per_session) {
                                        continue;
                                    }
                                }

                                //create session, then users as much as the minimum (add bot too)
                                let session = await DB_Sessions.create({
                                    Game_ID: lounge.Game_ID.Game_ID,
                                    Created_At: lounge.Time,
                                    Data: "",
                                }).fetch();

                                for(let lou of users){
                                    lou.Status = 1;
                                    lou.Session_ID = session.Session_ID;

                                    lou.Data = JSON.stringify({
                                        status: "start",
                                        time: Math.floor(new Date().getTime() / 1000),
                                        data: "",
                                    });

                                    lou.Game_ID = lounge.Game_ID.Game_ID;
                                    lou = JSON.parse(JSON.stringify(lou));
                                    await DB_Game_Lounge.update({Record_KEY: lou.Record_KEY}, lou);

                                    lounge_session.write(JSON.stringify({
                                        "module":"matchmaking",
                                        "type":"findgame",
                                        "session":session.Session_ID,
                                        "done":1
                                    }));
                                }

                                //save bots
                                for (let i = 0; i < (min_user_per_session - users.length); i++) {
                                    await DB_Game_Lounge.create({
                                        User_ID: null,
                                        Game_ID: lounge.Game_ID,
                                        Time: Math.floor(new Date().getTime() / 1000),
                                        Status: 1,
                                        Data: JSON.stringify({
                                            status: "start",
                                            time: Math.floor(new Date().getTime() / 1000),
                                            data: "",
                                        }),
                                        Session_ID: session.Session_ID,
                                        Is_Bot: 1
                                    });
                                }
                            }
                        }
                    }else{
                        //update to timeout
                        lounge.Status = 2;
                        lounge.Data = JSON.stringify({
                            status: "timeout",
                            time: Math.floor(new Date().getTime() / 1000),
                        });
                        if(lounge_session!==false){
                            lounge_session.write(JSON.stringify({
                                "module":"matchmaking",
                                "type":"findgame",
                                "message": "Timeout. Failed to find match.",
                                "done":0
                            }));
                        }

                        lounge.Game_ID = lounge.Game_ID.Game_ID;
                        lounge = JSON.parse(JSON.stringify(lounge));
                        await DB_Game_Lounge.update({Record_KEY: lounge.Record_KEY}, lounge);
                    }

                } else {
                    if (lounge.Status === 0) {
                        let lounges_candidate = await DB_Game_Lounge.find({
                            Status: 0,
                            Game_ID: lounge.Game_ID.Game_ID,
                            User_ID: {'!=': lounge.User_ID}
                        });

                        //number of user needed per session
                        if (lounges_candidate.length > lounge.Game_ID.Min_User_Per_Session - 1 && lounge_session !== false) {
                            let users = [lounge];
                            lounges_candidate = lounges_candidate.sort( () => Math.random() - 0.5);
                            for(let candidate of lounges_candidate){
                                let session_candidate = getSession(candidate.User_ID, clients);
                                if(session_candidate!==false){
                                    users.push(candidate);
                                }
                                if(users.length >= lounge.Game_ID.Max_User_Per_Session){
                                    continue;
                                }
                            }

                            if(users.length >= lounge.Game_ID.Min_User_Per_Session){
                                let session = await DB_Sessions.create({
                                    Game_ID: lounge.Game_ID.Game_ID,
                                    Created_At: lounge.Time,
                                    Data: "",
                                }).fetch();

                                for(let lounge of users){
                                    lounge.Data = JSON.stringify({
                                        status: "start",
                                        time: Math.floor(new Date().getTime() / 1000),
                                        data: ""
                                    });
                                    lounge.Status = 1;
                                    lounge.Session_ID = session.Session_ID;
                                    lounge = JSON.parse(JSON.stringify(lounge));
                                    lounge.Game_ID = session.Game_ID;
                                    await DB_Game_Lounge.update({Record_KEY: lounge.Record_KEY}, lounge);

                                    let session_data = JSON.stringify({
                                        "module":"matchmaking",
                                        "type":"findgame",
                                        "session":session.Session_ID,
                                        "isBot": 0,
                                        "done": 1
                                    });

                                    let session_target = getSession(lounge.User_ID, clients);
                                    session_target.write(session_data);

                                }

                            }
                            continue;
                            let random_number = Math.floor(Math.random() * lounges_candidate.length);
                            let match = lounges_candidate[random_number];
                            //check is offline or not
                            let match_session = getSession(match.User_ID, clients);

                            if (match_session !== false && lounge_session !== false) {
                                //create a new game session
                                let session = await DB_Sessions.create({
                                    Game_ID: lounge.Game_ID,
                                    Created_At: lounge.Time,
                                    Data: "",
                                }).fetch();

                                lounge.Data = JSON.stringify({
                                    status: "match",
                                    time: Math.floor(new Date().getTime() / 1000),
                                    data: ""
                                });
                                lounge.Status = 1;
                                lounge.Session_ID = session.Session_ID;

                                match.Data = JSON.stringify({
                                    status: "match",
                                    time: Math.floor(new Date().getTime() / 1000),
                                    data: ""
                                });
                                match.Status = 1;
                                match.Session_ID = session.Session_ID;

                                lounge = JSON.parse(JSON.stringify(lounge));
                                match = JSON.parse(JSON.stringify(match));

                                await DB_Game_Lounge.update({Record_KEY: match.Record_KEY}, match);
                                await DB_Game_Lounge.update({Record_KEY: lounge.Record_KEY}, lounge);

                                //send information
                                let session_data = JSON.stringify({
                                    "module":"matchmaking",
                                    "type":"findgame",
                                    "session":session.Session_ID,
                                    "isBot": 0,
                                    "done": 1
                                });
                                match_session.write(session_data);
                                lounge_session.write(session_data);
                            } else {
                                if (match_session === false) {
                                    match.Data = JSON.stringify({
                                        status: "offline",
                                        time: Math.floor(new Date().getTime() / 1000),
                                    });
                                    match.Status = 2;
                                    match = JSON.parse(JSON.stringify(match));
                                    await DB_Game_Lounge.update({Record_KEY: match.Record_KEY}, match);
                                }
                                if (lounge_session === false) {
                                    lounge.Data = JSON.stringify({
                                        status: "offline",
                                        time: Math.floor(new Date().getTime() / 1000),
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
    })().catch((err) => {
        console.error(err);
    });
};