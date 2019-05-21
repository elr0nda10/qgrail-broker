const zeromq = require("zeromq");
const async = require("async");

const ServiceBalancer = require(__dirname + "/service_balancer");
const Protocol = require(__dirname + "/protocol");

function Broker(opt) {
    if(opt === undefined) {
        throw new Error("opt must be defined");
    }
    if(opt.bind_address === undefined) {
        throw new Error("opt.bind_address must be defined");
    }
    if(opt.services === undefined) {
        throw new Error("opt.services must be defined");
    }

    this.log = opt.log;
    this.services = createServices(opt.services);
    this.router = createRouter(opt.bind_address);

    this.queue_task = async.priorityQueue((task, callback) => {
        if(task.type === "input") {
            const [identity, delimiter, data] = task.frames;
            const req = Protocol.decodeReq(data);

            this.log && this.log("broker-receive", req);
            this.services[req.header.service_name].send(task.frames);
        }
        else if(task.type === "output") {
            const [identity, delimiter, data] = task.frames;
            const req = Protocol.decodeReq(data);

            this.log && this.log("broker-reply", req);
            this.router.send(task.frames);
        }

        process.nextTick(callback);
    })
}

Broker.prototype.listen = function(callback) {
    Object.keys(this.services).forEach((name) => {
        const service = this.services[name];
        service.onMessage((...frames) => {
            this.queue_task.push({
                type: "output",
                frames
            }, 1);
        });
        service.listen();
    });

    this.router.on("message", (...frames) => {
        this.queue_task.push({
            type: "input",
            frames
        }, 2);
    });

    callback && callback();
};

Broker.prototype.close = function() {
    Object.keys(this.services).forEach((name) => {
        this.services[name].close();
    });
    if(this.router) {
        this.router.close();
        this.router = undefined;
    }
};

const createRouter = function(bind_address) {
    return zeromq.socket("router").bind(bind_address);
};

const createServices = function(services) {
    const results = {};
    services.forEach((service) => {
        results[service.name] = new ServiceBalancer(service.upstream);
    });

    return results;
};

module.exports = Broker;
