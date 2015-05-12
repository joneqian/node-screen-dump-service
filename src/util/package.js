/**
 * Created by qianqing on 14-3-24.
 */
var ByteBuffer = require('./ByteBuffer');
var utils = require('./utils');

var package = module.exports;

/*
 * check and invoke callback function
 * */
package.pack = function(commandID, data, cb) {
    //console.log('pack:'+data);
    if (!commandID || !data || !cb || typeof commandID !== 'number' || typeof cb !== 'function') {
        utils.invokeCallback(cb, new Error('pack parameter error.'));
        return;
    }

    var bytebuf = new ByteBuffer().encoding('utf8').bigEndian();

    /*var buf_len = Buffer.byteLength(context);
    var buf = new Buffer(buf_len);
    buf.write(context);*/

    var data_len = data.length;
    var packet_len = data_len + 4 + 2;
    var sendbuf = bytebuf.uint32(packet_len).ushort(commandID).byteArray(data, data_len).pack();
    bytebuf = null;

    utils.invokeCallback(cb, null, sendbuf);
    return;
};


package.unpack = function(data, cb) {
    if (!data || !cb || typeof cb !== 'function') {
        utils.invokeCallback(cb, new Error('unpack parameter error.'));
        return;
    }

    var bytebuf = new ByteBuffer(data).encoding('utf8').bigEndian();

    var len = data.length - 2;
    var resArr = bytebuf.ushort().byteArray(null, len).unpack();
    bytebuf = null;

    var context = new Buffer(resArr[1]);
    //utils.invokeCallback(cb, null,resArr[0],context.toString());
    utils.invokeCallback(cb, null, resArr[0], context);
    return;
};