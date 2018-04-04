var net = require('net');
var client = new net.Socket();
const readline = require('readline');

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
//
client.connect(1337, '54.169.52.26', function() {
    rl.question('What is your name? ', (answer) => {
        client.write(answer.toString());
    });
});

rl.on('line', (input) => {
    client.write(input.toString());
});

client.on('data', function(data) {
    console.log(data.toString());
    //client.destroy(); // kill client after server's response
});

client.on('error', function(err) {
    console.log(err)
})

client.on('close', function() {
    console.log('Connection closed');
});