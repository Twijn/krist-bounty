const express = require("express");
const app = express();
const config = require("./config.json");

app.get('/', function (req, res) {
    res.send("We're running!");
})

app.listen(config.port);
console.log("Started Express webserver on " + config.port);