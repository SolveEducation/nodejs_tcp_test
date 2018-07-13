/*
findgame(playerid,gameid) -> return session
makegamewith(listplayer,gameid) -> return session
 */
let Waterline = require("waterline");
module.exports = function (user, ontology, clients, data_from_client, response, chat_list) {
    let DB_Game_Lounge = ontology.collections.db_game_lounge;

    if(data_from_client.action === "findgame"){
        console.log("Find Game");
        let user_id = data_from_client.user_id;
        let game_id = data_from_client.game_id;

        //check if there is any user in lounge
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
                });
            }
        })().catch((err)=>{
            console.error(err);
        });
    }else if(data_from_client.action === "makegamewith"){
        let user_id = data_from_client.user_id;
        let group_user = data_from_client.user_group;
        let game_id = data_from_client.game_id;
    }
};
