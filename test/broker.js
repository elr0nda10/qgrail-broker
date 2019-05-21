const QBroker = require(__dirname + "/../");
const Broker = QBroker.Broker;

const broker = new Broker({
    bind_address: "tcp://127.0.0.1:30000",
    services: [
        {
            name: "calc",
            upstream: [
                "tcp://127.0.0.1:30001",
                "tcp://127.0.0.1:30002"
            ]
        }
    ],
    log: (type, data) => {
        console.log("TYPE: ", type);
        console.log("REQ: ", data);
    }
})

process.on("SIGINT", () => {
    console.log("BROKER TERMINATED");
    broker.close();
    process.exit(0);
});


broker.listen(() => {
    console.log("Broker listen at port 30000");
});

