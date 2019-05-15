const Promise = require("bluebird");

const QBroker = require(__dirname + "/../");
const Service = QBroker.Service;

const ServiceCalc = new Service("tcp://0.0.0.0:30003", {
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
        }, 200);
    })
})

ServiceCalc.listen(() => {
    console.log("service-calc-node-03 listen at port 30003");
});
