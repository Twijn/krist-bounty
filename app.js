const express = require("express");
const ws = require("ws");
const fs = require("fs");

const app = express();
const config = require("./config.json");

const krist = require("./krist");

const wsServer = new ws.Server({noServer: true});

const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));

const wsMethodFiles = grabFiles("./ws/methods");

let wsMethods = {};

for (const file of wsMethodFiles) {
    const method = require(`./ws/methods/${file}`);
    wsMethods[method.type] = method.func;
}

wsServer.on("connection", socket => {
    socket.on("message", message => {

        message = message.toString();
        try {
            const msg = JSON.parse(message);

            const reply = replyMessage => {
                if (msg.hasOwnProperty("nonce")) {
                    replyMessage.nonce = msg.nonce;
                }
                socket.send(JSON.stringify(replyMessage));
            }
            
            if (msg.hasOwnProperty("type")) {
                if (wsMethods.hasOwnProperty(msg.type)) {
                    wsMethods[msg.type](msg, reply, socket);
                } else {
                    reply({success: false, error: `Invalid method type '${msg.type}'`})
                }
            }
        } catch (err) {
            console.error(err);
        }
    });
});

app.get('/', function (req, res) {
    res.send("We're running!");
})

const server = app.listen(config.port);

server.on("upgrade", (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
        wsServer.emit("connection", socket, request);
    });
});

console.log("Started Express webserver on " + config.port);