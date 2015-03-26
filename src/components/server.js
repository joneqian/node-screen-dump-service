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


worker.on('message', function(data, from, pid) {

});

worker.ready(function(socket, which) {
	server.emit('connection', socket);
});

worker.on('suicide', function(by) {
	logger_server.info('suicide by ' + by);
});

process.on('uncaughtException', function(err) {
	logger_server.error('Caught Exception:' + err);
});

var server = require('net').createServer(function(socket) {

	var recv_buffer = new ExBuffer().ushortHead().bigEndian();
	recv_buffer.on('data', onReceviveUnpackData);
	// 我们获得一个连接 - 该连接自动关联一个socket对象
	console.log('CONNECTED: ' + socket.remoteAddress + ':' + socket.remotePort);

	// 为这个socket实例添加一个"data"事件处理函数
	socket.on('data', function(data) {
		recv_buffer.put(data);
	});

	// 为这个socket实例添加一个"close"事件处理函数
	socket.on('end', function(data) {

	});

	// 为这个socket实例添加一个"close"事件处理函数
	socket.on('close', function(data) {

	});

	// 为这个socket实例添加一个"close"事件处理函数
	socket.on('error', function(error) {
		logger_server.error('socket error:' + error);
	});

});

function onReceviveUnpackData(data) {
	packet.unpack(data, function(err, command, data) {
		if (err) {
			logger_server.error('unpack data error: ' + err);
			return;
		}

		switch (command) {
			case COMMAND.REGISTER_REQ:
				processRegister(data);
				break;
		}
	});
}

function processRegister(data) {
	var bytebuf = new ByteBuffer(data).encoding('utf8').bigEndian();
	var  len = bytebuf.ushort().unpack();
	var  key = bytebuf.vstring(null,len[0]).unpack();
	if (key[1] === config.KEY) {
		return true;
	} else {
		return false;
	}
}