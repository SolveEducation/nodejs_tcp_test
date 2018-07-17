module.exports = function (id, sessions) {
    for(let session of sessions){
        if(typeof (session) !== "undefined"){
            if(session.user_detail.User_ID == id){
                return session;
            }
        }
    }
    return false;
};