const zeromq = require("zeromq");
const Promise = require("bluebird");

const Protocol = require(__dirname + "/protocol");

function Service(address, opt) {
    this.address = address;
    this.worker = false;
    this.function_list = {};
    this.log = (opt && opt.log) || undefined;

    process.on("SIGINT", () => {
        this.close();
    });
}

Service.prototype.func = function(name, fn) {
    if(typeof fn === "function" && typeof name === "string") {
        this.function_list[name] = fn;
        return true;
    }
    else {
        throw new Error("name must be string and fn must be function");
    }
};

Service.prototype.listen = function(callback) {
    if(this.worker !== false) {
        return;
    }

    this.worker = zeromq.socket("router").bind(this.address);
    this.worker.on("message", (...frames) => {
        const [id1, id2, delimiter, data] = frames;
        const req = Protocol.decodeReq(data);
        this.log && this.log("service-input", req);

        let process = null;
        if(req.fn && this.function_list[req.fn] && req.params) {
            const fn = this.function_list[req.fn];
            process = processFunction(fn, req);
        }
        else {
            process = processNotFoundFunction(req);
        }

        process
            .then((output) => {
                req.output = output;
            })
            .catch((err) => {
                req.output = err;
            })
            .finally(() => {
                this.log && this.log("service-output", req);

                const bytes_sent = [id1, id2, delimiter];
                bytes_sent.push(Protocol.encodeReq(req));
                this.worker.send(bytes_sent);
            });
    });

    callback && callback();
};

Service.prototype.close = function() {
    if(this.worker !== undefined) {
        this.worker.close();
        this.worker = undefined;
    }
    this.function_list = undefined;
    this.address = undefined;
};

const processFunction = function(fn, req) {
    let output = {};
    try {
        output = fn(req.params);
    }
    catch(err) {
        output = err;
    }
    finally {
        return Promise.resolve(output);
    }
}

const processNotFoundFunction = function(req) {
    return Promise.resolve(new Error("Invalid function or parameter: " + req.fn));
};


module.exports = Service;

