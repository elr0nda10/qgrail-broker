const QBroker = require(__dirname + "/../");
const Client = QBroker.Client;

const ClientCalc = new Client("tcp://127.0.0.1:30000", "calc", {
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

process.on("SIGINT", () => {
    console.log("Total Processed: ", totalProcessed);
    process.exit(0);
});

for(let a = 0; a < 100; ++a) {
    for(let b = 0; b < 100; ++b) {
        sent(a, b);
    }
}
