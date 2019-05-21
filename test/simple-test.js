const Promise = require("bluebird");

const QBroker = require(__dirname + "/../");

const createBroker = function() {
    const Broker = QBroker.Broker;

    const broker = new Broker({
        bind_address: "tcp://127.0.0.1:30000",
        services: [
            {
                name: "calc",
                upstream: [
                    "tcp://127.0.0.1:30001",
                    "tcp://127.0.0.1:30002",
                    "tcp://127.0.0.1:30003"
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
};

const createService1 = function() {
    const Service = QBroker.Service;

    const ServiceCalc = new Service("tcp://0.0.0.0:30001", {
        log: (type, data) => {
            console.log("TYPE: ", type);
            console.log("REQ: ", data);
        }
    });

    ServiceCalc.func("add", ({a, b}) => {
        return a + b;
    });

    ServiceCalc.func("add-async", ({a, b}) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(a + b);
            }, 300);
        })
    })

    ServiceCalc.listen(() => {
        console.log("service-calc-node-01 listen at port 30001");
    });
};

const createService2 = function() {
    const Service = QBroker.Service;

    const ServiceCalc = new Service("tcp://0.0.0.0:30002", {
        log: (type, data) => {
            console.log("TYPE: ", type);
            console.log("REQ: ", data);
        }
    });

    ServiceCalc.func("add", ({a, b}) => {
        return a + b;
    });

    ServiceCalc.func("add-async", ({a, b}) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(a + b);
            }, 250);
        })
    })

    ServiceCalc.listen(() => {
        console.log("service-calc-node-02 listen at port 30002");
    });
};

const runClient = function() {
    const Client = QBroker.Client;

    const ClientCalc = new Client("tcp://127.0.0.1:30000", "calc", {
        log(type, data) {
            console.log("CLIENT: ", type, "\n", data);
        }
    });
    let totalProcessed = 0;

    const sent = function(a, b) {
        //console.log(`${a} + ${b}`);
        ClientCalc.invoke("add", {a, b})
            .then((result) => {
                console.log(`add: ${a} + ${b} = ${result}`);
                totalProcessed = totalProcessed + 1;
            });

        ClientCalc.invoke("add-async", {a, b})
            .then((result) => {
                console.log(`add-async: ${a} + ${b} = ${result}`);
                totalProcessed = totalProcessed + 1;
            })
    };

    sent(0, 1);
    sent(0, 2);
}


setTimeout(() => createBroker(), 1000);
setTimeout(() => createService1(), 2000);
setTimeout(() => createService2(), 3000);
setTimeout(() => runClient(), 5000);

