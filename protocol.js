const Msgpack = require("msgpack-lite");
const Random = require("csprng");

const createHeader = function createHeader(service_name) {
    return {
        id: Random(64, 36),
        start_time: Date.now(),
        finish_time: 0,
        service_name
    };
};

module.exports.createReqObj = function createReqObj(service_name, fn, params) {
    const payload = {
        fn,
        params,
        header: createHeader(service_name),
        output: {}
    };

    return payload;
};

module.exports.encodeReq = function encodeReq(req_obj) {
    return Msgpack.encode(req_obj);
};

module.exports.decodeReq = function decodeReq(request) {
    const decoded = Msgpack.decode(request);

    decoded.header.finish_time = Date.now();

    return decoded;
};

