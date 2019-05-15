const QBroker = require(__dirname + "/../");
const Client = QBroker.Client;

const ClientCalc = new Client("tcp://127.0.0.1:30000", "calc");
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
    if(totalProcessed === 20000) {
        console.log("OK");
    }
    else {
        console.log("NOT OK: ", (20000 - totalProcessed));
    }
})

for(let a = 0; a < 10; a++) {
    for(let b = 0; b < 1000; b++) {
        sent(a, b);
    }
}

