let net = require('net');
let client = new net.Socket();
const readline = require('readline');

reconnect_server();
function reconnect_server() {
    client.connect(1337, 'localhost', function(){
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

    rl.on('line', (input) => {
        client.write(input.toString())
    });

    client.on('data', function(data) {
        console.log(data.toString());
    });

    client.on('error', function(err) {
        console.log(err)
    });

    client.on('close', function() {
        console.log('Connection closed');
        
    });
}