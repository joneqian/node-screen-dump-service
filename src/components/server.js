var worker = require('pm').createWorker();
var logger_server = require('./logger').server;
var url = require('url');
var fs = require('fs');
var path = require('path');
var SERVER_CONFIG = require('../config/config').SERVER_CONFIG;
var COMMAND = require('../config/config').COMMAND;
var COMMON_CONFIG = require('../config/config').COMMON_CONFIG;
var ExBuffer = require('../util/ExBuffer');
var packet = require('../util/package');
var ByteBuffer = require('../util/ByteBuffer');
var Readable = require('stream').Readable;

var virtual_list = {};
var socket_map = new Array();

worker.on('message', function(data, from, pid) {

});

worker.ready(function(socket, which) {
	server.emit('connection', socket);
});

worker.on('suicide', function(by) {
	logger_server.info('suicide by ' + by);
});

process.on('uncaughtException', function(error) {
	logger_server.error('Caught Exception:server(' + process.pid + ') ' + error);
});

process.on('exit', function (code) {
      logger_server.info('server(' + process.pid + ')  is closed(' + code + ').');
});

var server = require('net').createServer(function(socket) {

	var recv_buffer = new ExBuffer().uint32Head().bigEndian();
	recv_buffer.on('data', function(data) {
		packet.unpack(data, function(error, command, buf) {
			if (error) {
				logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') unpack error:' + error);
				socket.destroy();
				return;
			}

			switch (command) {
				case COMMAND.REGISTER_REQ:
					processRegister(socket, buf);
					break;
				case COMMAND.UPDATE_VIRTUAL_LIST:
					processVirtualList(socket, buf);
					break;
				case COMMAND.UPDATE_VIRTUAL_DUMP:
					processVirtualDump(socket, buf);
					break;
				default:
					socket.destroy();
					return;
			}
		});
	});
	// 我们获得一个连接 - 该连接自动关联一个socket对象
	console.log('CONNECTED: ' + socket.remoteAddress + ':' + socket.remotePort);

	// 为这个socket实例添加一个"data"事件处理函数
	socket.on('data', function(data) {
		recv_buffer.put(data);
	});

	// 为这个socket实例添加一个"end"事件处理函数
	socket.on('end', function(data) {

	});

	// 为这个socket实例添加一个"close"事件处理函数
	socket.on('close', function(data) {
		delete virtual_list[socket_map[socket]];
		delete socket_map[socket];
		saveVirtualList();
	});

	// 为这个socket实例添加一个"error"事件处理函数
	socket.on('error', function(error) {
		logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') error:' + error);
	});

});

function checkSocket(socket) {
	if (socket_map[socket] === undefined) {
		socket.destroy();
		return false;
	} else {
		return true;
	}
}

function processRegister(socket, data) {
	var recv_bytebuf = new ByteBuffer(data).encoding('utf8').bigEndian();
	//get key len
	var len = recv_bytebuf.ushort().unpack();
	//get key array, key[0] is key len,key[1] is key string
	var recv_arr = recv_bytebuf.byteArray(null, len[0]).unpack();
	var isOK = 0;
	var key = new Buffer(recv_arr[1]);
	key = key.toString().split('@@');
	if (key.length === 2 && key[0] === COMMON_CONFIG.KEY) {
		isOK = 1;
	}

	var send_bytebuf = new ByteBuffer().encoding('utf8').bigEndian();
	var sendbuf = send_bytebuf.ushort(isOK).pack();
	packet.pack(COMMAND.REGISTER_RES, sendbuf, function(error, buf) {
		if (error) {
			logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') pack error:' + error);
			socket.destroy();
			return;
		}

		socket.write(buf);
		if (isOK) {
			socket_map[socket] = key[1];
		} else {
			socket.destroy();
		}
	});
}

function processVirtualList(socket, data) {
	if (!checkSocket(socket)) {
		return;
	}
	var recv_bytebuf = new ByteBuffer(data).encoding('utf8').bigEndian();
	var len = recv_bytebuf.ushort().unpack();
	var recv_arr = recv_bytebuf.byteArray(null, len[0]).unpack();
	try {
		var buf = new  Buffer(recv_arr[1]);
		var obj = JSON.parse(buf.toString());
		virtual_list[socket_map[socket]] = obj;
		saveVirtualList();

	} catch (e) {
		logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') json parse error:' + e);
		logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') invalid json:' + recv_arr[1]);
	}
}

function saveVirtualList() {
	/*fs.writeFile(SERVER_CONFIG.VIRTUAL_LIST_PATH, JSON.stringify(virtual_list), function(error) {
		if (error) {
			logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') save virtual list error:' + error);
		}
	});*/

	var rs = new Readable;
	rs.push(JSON.stringify(virtual_list));
	rs.push(null);
	var writestream = fs.createWriteStream(SERVER_CONFIG.VIRTUAL_LIST_PATH);
	rs.pipe(writestream);
}

function processVirtualDump(socket, data) {
	if (!checkSocket(socket)) {
		return;
	}

	var recv_bytebuf = new ByteBuffer(data).encoding('utf8').bigEndian();
	var len = recv_bytebuf.ushort().uint32().unpack();
	var recv_arr = recv_bytebuf.byteArray(null, len[0]).byteArray(null, len[1]).unpack();

	var fileName = new Buffer(recv_arr[2]);
	var rs = new Readable;
	 var buf = new Buffer(recv_arr[3], 'utf8');
	rs.push(buf);
	rs.push(null);
	var writestream = fs.createWriteStream(SERVER_CONFIG.VIRTUAL_DUMP_PATH + fileName );
	rs.pipe(writestream);
}