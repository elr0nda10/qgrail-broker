const zeromq = require("zeromq");
const Promise = require("bluebird");
const Protocol = require(__dirname + "/protocol");

function Client(broker_address, service_name, opt) {
    this.address = broker_address;
    this.service_name = service_name;
    this.promise_objects = {};
    this.log = opt && opt.log;
    this.socket = zeromq.socket("dealer").connect(this.address);
    socketListener(this.socket, this.promise_objects, {log: this.log});
    process.on("SIGINT", () => {
        if(this.socket) {
            this.socket.close();
            this.socket = undefined;
        }
        this.promise_objects = undefined;
    });
};

Client.prototype.invoke = function(fn, params) {
    return new Promise((resolve, reject) => {
        const req = Protocol.createReqObj(this.service_name, fn, params);
        this.log && this.log("client-input", req);
        const req_id = req.header.id;

        this.promise_objects[req_id] = {
            resolve,
            reject
        };

        const delimiter = Buffer.alloc(0);
        this.socket.send([
            delimiter,
            Protocol.encodeReq(req)
        ]);
    });
};

const socketListener = function(socket, promise_objects, opt) {
    socket.on("message", (...outputs) => {
        try {
            const [delimiter, msg] = outputs;
            if(Buffer.byteLength(delimiter) !== 0) {
                return;
            }
            const req = Protocol.decodeReq(msg);
            opt.log && opt.log("client-output", req);
            const req_id = req.header.id;

            promise_objects[req_id].resolve(req.output);

            promise_objects[req_id] = undefined;
            delete promise_objects[req_id];
        }
        catch(err) {
            console.log("Error: ", err);
        }
    })
};

module.exports = Client;
