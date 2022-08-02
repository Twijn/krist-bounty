const {KristApi, parseCommonMeta} = require("krist");
const krist = new KristApi();

const config = require("./config.json");

const ws = krist.createWsClient({
    initialSubscriptions: ["transactions"]
});

ws.on("transaction", async ({transaction}) => {
    if (transaction.type === "transfer" && transaction.to === config.krist.address) {
        const meta = parseCommonMeta(transaction.metadata);

        if (!meta.metaname || transaction.value === 0) return;

        if (meta.name !== config.krist.name) return;

        if (meta.metaname.toLowerCase() === "tip") {
            let returnAddr = "bounty.kst";
            if (meta.return) {
                returnAddr = meta.return;
            }
            const trns = await krist.makeTransaction(config.krist.tipAddress, transaction.value, {password: config.krist.secret, metadata: "message=Tip income;return=" + returnAddr});
            return;
        }

        
    }
});

ws.on("ready", async () => {
    console.log("Krist WS Ready!");

    const result = await krist.login({password: config.krist.secret});
    console.log("Authenticated as " + result.address);
});

ws.connect();

module.exports = krist;