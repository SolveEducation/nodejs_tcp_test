/*
joinsession(idsession)
getactiveplayer(idsession)
getsessiondata(idsession)
setsessiondata(idsession)
pushupdate(toplayer)
 */
let getCurrentID = require("../library/getCurrentID");
module.exports = function (session, ontology, clients, data_from_client) {
    let DB_Game_Lounge = ontology.collections.db_game_lounge;
    let DB_Sessions = ontology.collections.db_sessions;
    let user_id = getCurrentID(session, clients);
    if(data_from_client.type === "joinsession"){
        (async ()=>{
            let session_id = data_from_client.Session_ID;
            //search is session exists or not
            let sessions = await DB_Sessions.findOne({Session_ID: session_id});
            let users = await DB_Game_Lounge.find({Session_ID: session_id});

            if(typeof sessions === "undefined"){
                //failed
            }

        })().catch((err)=>{
            console.error(err);
        });

    }else if(data_from_client.type === "getactiveplayer"){

    }else if(data_from_client.type === "getSessionData"){

    }else if(data_from_client.type === "setSessionData"){

    }

    }
};