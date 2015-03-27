var worker = require('pm').createWorker();
var logger_server = require('./logger').server;
var url = require('url');
var fs = require('fs');
var path = require('path');
var mime = require('../config/mime').types;
var config = require('../config/config');
var ExBuffer = require('../util/ExBuffer');
var packet = require('../util/package');
var ByteBuffer = require('../util/ByteBuffer');
var COMMAND = config.COMMAND;

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

var server = require('net').createServer(function(socket) {

	var recv_buffer = new ExBuffer().ushortHead().bigEndian();
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
	var unpack_res = recv_bytebuf.vstring(null, len[0]).unpack();
	var isOK = 0;
	var key = unpack_res[1].split('@@');
	if (key.length === 2 && key[0] === config.KEY) {
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
	//get key len
	var len = recv_bytebuf.ushort().unpack();
	//get key array, key[0] is key len,key[1] is key string
	var arr = recv_bytebuf.vstring(null, len[0]).unpack();
	try {
		var obj = JSON.parse(arr[1]);
		virtual_list[socket_map[socket]] = obj;
		saveVirtualList();

	} catch (e) {
		logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') json parse error:' + e);
		logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') invalid json:' + arr[1]);
	}
}

function saveVirtualList() {
	fs.writeFile(config.Config.VIRTUAL_LIST_PATH, JSON.stringify(virtual_list), function(error) {
		if (error) {
			logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') save virtual list error:' + error);
		}
	});
}