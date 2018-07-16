let getSession = require('./library/getSession');

module.exports = function (ontology, clients) {
    let DB_Game_Lounge = ontology.collections.db_game_lounge;
    let DB_Sessions = ontology.collections.db_sessions;

    (async () => {
        while (true === true) {
            let lounges = await DB_Game_Lounge.find({Status: 0});
            for (let lounge of lounges) {
                let lounge_session = getSession(lounge.User_ID, clients);
                lounge = await DB_Game_Lounge.findOne({Record_KEY: lounge.Record_KEY});
                //check for timeout
                if (lounge.Time + 60 < Math.floor(new Date().getTime() / 1000)) {
                    //if timeout and online, then create a new session
                    lounge.Data = JSON.stringify({
                        status: "start",
                        time: Math.floor(new Date().getTime() / 1000),
                        data: ""
                    });

                    if(lounge_session===false){
                        lounge.Status = 3;
                    }else{
                        lounge.Status = 2;
                        let session = await DB_Sessions.create({
                            Game_ID: lounge.Game_ID,
                            Created_At: lounge.Time,
                            Data: "",
                        }).fetch();
                        lounge.Session_ID = session.Session_ID;
                        lounge_session.write(JSON.stringify({
                            "type" : "playbot",
                            "session" : session.Session_ID,
                            "done" : 1
                        }));
                    }

                    lounge = JSON.parse(JSON.stringify(lounge));
                    await DB_Game_Lounge.update({Record_KEY: lounge.Record_KEY}, lounge);
                } else {
                    if (lounge.Status === 0) {
                        let lounges_candidate = await DB_Game_Lounge.find({
                            Status: 0,
                            Game_ID: lounge.Game_ID,
                            User_ID: {'!=': lounge.User_ID}
                        });
                        if (lounges_candidate.length > 0) {
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
                                    "type" : "playmatch",
                                    "session" : session.Session_ID,
                                    "done" : 1
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