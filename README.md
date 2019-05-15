# qgrail-broker
Broker to connect each services in qgrail project.

Install using npm

```npm install --save qgrail-broker```

qgrail-broker has 3 major components:

* Broker
* Service
* Client

## Broker

To create broker is just as simple as this:

```javascript
const QBroker = require("qgrail-broker");
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
});

process.on("SIGINT", () => {
    console.log("BROKER TERMINATED");
    broker.close();
});


broker.listen(() => {
    console.log("Broker listen at port 30000");
});

```

This will create broker that bind at ```tcp://127.0.0.1:30000```, and has service ```calc``` that will available at 3 ports ```30001, 30002, 30003```.

The broker will load balancing at those 3 ports if there is request to ```calc``` service.


## Service

To create service you just need to do this:

```javascript
const Promise = require("bluebird");

const QBroker = require("qgrail-broker");
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

```

So after creating the service, then just define all functions you want, and create normal function.

You can return any object, including ```Promise``` object for async process.

NOTE: function parameter will only an object, that contain all parameter. I use object here so you don't need to confuse about the parameters sequences.
NOTE: you need to define all function before starting to listen.

## Client

To connect with the service, you need a client. You can define client with this:

```javascript
const QBroker = require("qgrail-broker");
const Client = QBroker.Client;

const ClientCalc = new Client("tcp://127.0.0.1:30000", "calc");

const sent = function(a, b) {
    ClientCalc.invoke("add", {a, b})
        .then((result) => {
            console.log(`add: ${a} + ${b} = ${result}`);
        });

    ClientCalc.invoke("add-async", {a, b})
        .then((result) => {
            console.log(`add-async: ${a} + ${b} = ${result}`);
        })
};

for(let a = 0; a < 10; a++) {
    for(let b = 0; b < 10; b++) {
        sent(a, b);
    }
}
```

So first you need to create new Client object by passing broker's address and what service you want to connect.

To invoke the function just need to call ```invoke``` method by passing ```fn``` and ```params``` object. 

Return value of function will be at ```result```.


# Version note:

* 0.0.1: can work great for non high traffics (around 100 request per sec).


