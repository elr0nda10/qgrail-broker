const zeromq = require("zeromq");

function ServiceBalancer(upstream) {
    this.upstream = upstream;
    this.dealers = [];
    this.cursor_index = 0;
}

ServiceBalancer.prototype.listen = function() {
    this.upstream.forEach((address) => {
        this.dealers.push(createDealer(address, this.callback));
    });
};

ServiceBalancer.prototype.close = function() {
    this.dealers.forEach((dealer) => {
        dealer.close();
    });
    this.dealers = [];
};

ServiceBalancer.prototype.send = function(frames) {
    const handler = this.dealers[this.cursor_index];
    this.cursor_index = (this.cursor_index + 1) % this.dealers.length;

    handler.send(frames);
};

ServiceBalancer.prototype.onMessage = function(callback) {
    this.callback = callback;
};

const createDealer = function(address, callback) {
    const socket = zeromq.socket("dealer").connect(address);
    socket.on("message", (...frames) => {
        callback(...frames);
    });

    const dealer = {
        address,
        close: function() {
            socket.close();
        },
        send: function(frames) {
            socket.send(frames);
        }
    };
    return dealer;
};

module.exports = ServiceBalancer;
