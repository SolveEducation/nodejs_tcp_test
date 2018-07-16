/*
findgame(playerid,gameid) -> return session
makegamewith(listplayer,gameid) -> return session
 */
let getCurrentID = require('../library/getCurrentID');
let getSessions = require('../library/getSession');
module.exports = function (session, ontology, clients, data_from_client) {
    let DB_Game_Lounge = ontology.collections.db_game_lounge;

    if(data_from_client.action === "findgame"){
        console.log("Find Game");
        let user_id = getCurrentID(session,clients);
        let game_id = data_from_client.game_id;

        //check if there is any user in lounge
        if(user_id !== false){
            //DB_Game_Lounge
            (async ()=>{
                let lounge = await DB_Game_Lounge.findOne({Game_ID: game_id, User_ID: user_id, Status: 0});
                if(typeof(lounge) === "undefined"){
                    lounge = await DB_Game_Lounge.create({
                        User_ID: user_id,
                        Game_ID: game_id,
                        Time: Math.floor(new Date().getTime()/1000),
                        Status: 0,
                        Data: ''
                    }).fetch();

                    session.write(JSON.stringify({
                        "type" : "request",
                        "message" : "New request is created",
                        "done" : 1,
                        "wlid" : lounge.Record_KEY
                    }))
                }else{
                    session.write(JSON.stringify({
                        "type" : "request",
                        "message" : "Already requested",
                        "done" : 1,
                        "wlid" : lounge.Record_KEY
                    }))
                }
            })().catch((err)=>{
                console.error(err);
            });
        }else{
            session.write(JSON.stringify({
                "type" : "auth",
                "message" : "not a valid user",
                "done" : 0
            }))
        }
    }else if(data_from_client.action === "makegamewith"){
        let user_id = getCurrentID(session,clients);
        let group_user = data_from_client.user_group;
        let game_id = data_from_client.game_id;

        //check users from group user
        let not_found = false;
        let list_of_sessions = [];
        group_user = group_user.split(",");
        for(let user of group_user){
            let the_session = getSessions(user,clients);
            if(getSessions(user,clients) === false){
                not_found = true;
            }
        }

        if(not_found===true){

        }else{

        }
    }
};
