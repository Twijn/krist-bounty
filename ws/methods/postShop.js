const con = require("../../database");
const crypto = require("crypto");

module.exports = {
    type: "postShop",
    func: (msg, reply, socket) => {
        if (msg.hasOwnProperty("id") && msg.hasOwnProperty("private")) {
            con.query("select id from shop where id = ? and private = md5(?);", [msg.id, msg.private], (err, res) => {
                if (err) {
                    console.error(err);
                    reply({success: false, error: "Internal error"});
                } else {
                    if (res.length > 0) {
                        socket.shopId = res[0].id;
                        reply({success: true, id: res[0].id});
                    } else {
                        reply({success: false, error: "Invalid private key"})
                    }
                }
            });
        } else {
            reply({success: false, error: "Missing parameter(s). Required: ['id', 'private']"})
        }
    }
}