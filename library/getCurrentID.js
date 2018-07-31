module.exports = function (session, sessions, status=false) {
    let session_now = null;
    for(let val of sessions){
         if(val == session){

             return session.user_detail.User_ID;

         }
     }

    return false;
};