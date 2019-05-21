const zeromq = require("zeromq");
const Promise = require("bluebird");

const Async = require("async");

const Protocol = require(__dirname + "/protocol");

function Service(address, opt) {
    this.address = address;
    this.worker = false;
    this.function_list = {};
    this.log = (opt && opt.log) || undefined;
    this.queue = createQueue(this);
    process.on("SIGINT", () => {
        this.close();
    });
}

const createQueue = function(obj) {
    return Async.priorityQueue((task, cb) => {
        if(task.type === "input") {
            processInput(obj, task);
        }
        else if(task.type === "output") {
            processOutput(obj, task);
        }
        process.nextTick(cb);
    });
};

const processInput = function(obj, task) {
    const [id1, id2, delimiter, data] = task.frames;
    const req = Protocol.decodeReq(data);

    obj.log && obj.log("service-input", req);
    let proc = null;
    if(req.fn && obj.function_list[req.fn] && req.params) {
        const fn = obj.function_list[req.fn];
        proc = processFunction(fn, req);
    }
    else {
        proc = processNotFoundFunction(req);
    }

    proc.then((output) => {
            req.output = output;
        })
        .catch((err) => {
            req.output = err;
        })
        .finally(() => {
            obj.queue.push({
                id1, id2, delimiter, req,
                type: "output"
            }, 1);
        })
};

const processOutput = function(obj, task) {
    obj.log && obj.log("service-output", task.req);

    const bytes_sent = [task.id1, task.id2, task.delimiter];
    bytes_sent.push(Protocol.encodeReq(task.req));
    obj.worker.send(bytes_sent);
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
        this.queue.push({
            frames,
            type: "input"
        }, 2);
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

