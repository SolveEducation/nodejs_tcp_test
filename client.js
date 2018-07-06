let net = require('net');
let client = new net.Socket();
const readline = require('readline');

reconnect_server();
function reconnect_server() {
    client.connect(1337, '127.0.0.1', function(){
        if(interval_reconnect!==null){
            clearInterval(interval_reconnect);
        }
    });
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    //54.169.52.26
    var interval_reconnect = null;
    var user_id = null;

    console.log("What is your User ID?");
    rl.on('line', (input) => {
        if(user_id == null){
            input = input.toString();
            user_id = input;
            let data = {
                'type' : "chat",
                'user_id' : input,
                'request' : "register"
            };
            client.write(JSON.stringify(data));
        }else{
            client.write(input.toString());
        }
    });

    client.on('data', function(data) {
        console.log(data.toString());
        //client.destroy(); // kill client after server's response
    });

    client.on('error', function(err) {
        console.log(err)
    });

    client.on('close', function() {
        console.log('Connection closed');
        
    });
}

/*
    Request Chat:
    {
        'type' : 'chat',
        'user_id' : 488,
        'request' : 'register'
        'message' : ''
    },
    {
        'type' : 'chat',
        'user_id' : 488,
        'request' : 'reply'
        'message' : ''
    }
 */