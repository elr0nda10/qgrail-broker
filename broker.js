const zeromq = require("zeromq");

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
}

Broker.prototype.listen = function(callback) {
    Object.keys(this.services).forEach((name) => {
        const service = this.services[name];
        service.onMessage((...frames) => {
            const [identity, delimiter, data] = frames;
            const req = Protocol.decodeReq(data);

            this.log && this.log("broker-reply", req);
            this.router.send(frames);
        });
        service.listen();
    });

    this.router.on("message", (...frames) => {
        const [identity, delimiter, data] = frames;
        const req = Protocol.decodeReq(data);

        this.log && this.log("broker-receive", req);
        this.services[req.header.service_name].send(frames);
    });

    callback && callback();
};

Broker.prototype.close = function() {
    Object.keys(this.services).forEach((name) => {
        this.services[name].close();
    });
    this.router.close();
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
