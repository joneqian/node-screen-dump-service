var worker = require('pm').createWorker();
var logger_client = require('./logger').client;
var exec = require('child_process').exec;
var url = require('url');
var fs = require('fs');
var path = require('path');
var config = require('../config/config');
var ExBuffer = require('../util/ExBuffer');
var packet = require('../util/package');
var ByteBuffer = require('../util/ByteBuffer');
var Readable = require('stream').Readable;
var COMMAND = config.COMMAND;
var CONFIG = config.Config;
var SCREENSHOT_PATH = process.cwd() + '/ScreenShotFile'

var client = null;
var connectTimeout = 30000;
var connectInterval = null;
var virshlistTimeout = 10000;
var virshlistInterval = null;
var virshscreenTimeout = 5000;
var virshscreenInterval = null;
var exBuffer = null;
var registerStatus = false;
var connectedStatus = false;

worker.on('message', function(data, from, pid) {

});

worker.ready(function(socket, which) {});

worker.on('suicide', function(by) {
	logger_client.info('suicide by ' + by);
});

process.on('exit', function() {
	logger_client.info('client(' + process.pid + ')  is closed(' + code + ').');
	if (connectInterval) {
		clearInterval(connectInterval);
		connectInterval = undefined;
	}

	if (virshlistInterval) {
		clearInterval(virshlistInterval);
		virshlistInterval = undefined;
	}

	if (virshscreenInterval) {
		clearInterval(virshscreenInterval);
		virshscreenInterval = undefined;
	}
});

process.on('uncaughtException', function(err) {
	logger_client.error('Caught Exception:' + err);
});

function connectServer() {
	if (client) {
		client.destroy();
		client = undefined;
	}
	client = new require('net').Socket();

	client.connect(CONFIG.SCREEN_DUMP_PORT, CONFIG.SCREEN_DUMP_HOST, function() {
		logger_client.debug('connect to: ' + CONFIG.SCREEN_DUMP_HOST + ':' + CONFIG.SCREEN_DUMP_PORT);
		connectedStatus = true;
		exBuffer = undefined;
		exBuffer = new ExBuffer().uint32Head().bigEndian();
		exBuffer.on('data', function(data) {
			packet.unpack(data, function(error, command, buf) {
				if (error) {
					logger_client.error('client(' + process.pid + ') unpack error:' + error);
					return;
				}

				switch (command) {
					case COMMAND.REGISTER_RES:
						processRegister(buf);
						break;
					default:
						return;
				}
			});
		});

		// 建立连接后立即向服务器发送注册请求
		sendRegisterReq();
	});

	// 为客户端添加“data”事件处理函数
	// data是服务器发回的数据
	client.on('data', function(data) {
		exBuffer.put(data);
	});

	// 为客户端添加“close”事件处理函数
	client.on('close', function() {
		logger_client.debug('client(' + process.pid + ') connection closed');
		registerStatus = false;
		connectedStatus = false;;
	});

	// 为客户端添加“error”事件处理函数
	client.on('error', function(error) {
		logger_client.error('client(' + process.pid + ') tcp socket err:' + error);
	});
}

function sendRegisterReq() {
	var bytebuf = new ByteBuffer().encoding('utf8').bigEndian();
	var key = CONFIG.KEY + '@@' + require("os").hostname();
	var buf_len = Buffer.byteLength(key);
	var buf = new Buffer(buf_len);
	buf.write(key);
	var sendbuf = bytebuf.ushort(buf_len).byteArray(buf, buf_len).pack();
	packet.pack(COMMAND.REGISTER_REQ, sendbuf, function(err, buf) {
		if (err) {
			logger_client.error('register pack error: ' + err);
			return;
		}

		client.write(buf);
	});
}

function processRegister(data) {
	var recv_bytebuf = new ByteBuffer(data).encoding('utf8').bigEndian();
	var res = recv_bytebuf.ushort().unpack();

	if (res[0] === 1) {
		registerStatus = true;
		logger_client.info('client(' + process.pid + ') register successfully.');
	} else {
		logger_client.error('client(' + process.pid + ') register fail.');
		registerStatus = false;
	}
}

function processPPMtoJPG(in_file, out_file) {
	exec('python ' + process.cwd() + '/shell/ppm.py ' + in_file + ' ' + out_file + ' ', function(error, stdout, stderr) {
		if (error) {
			logger_client.error('client(' + process.pid + ') processPPMtoJPG fail: ' + stderr);
			return;
		}
	});
}

function virshlistUpdate() {
	exec('python ' + process.cwd() + '/shell/virsh_list.py', function(error, stdout, stderr) {
		if (error) {
			logger_client.error('client(' + process.pid + ') virshlistUpdate fail: ' + stderr);
			return;
		}
		var bytebuf = new ByteBuffer().encoding('utf8').bigEndian();
		var buf_len = Buffer.byteLength(stdout);
		var buf = new Buffer(buf_len);
		buf.write(stdout);
		var sendbuf = bytebuf.ushort(buf_len).byteArray(buf, buf_len).pack();
		packet.pack(COMMAND.UPDATE_VIRTUAL_LIST, sendbuf, function(err, buf) {
			if (err) {
				logger_client.error('update virsh list pack error: ' + err);
				return;
			}

			client.write(buf);
		});

	});
}

connectServer();

connectInterval = setInterval(function() {
	if (!connectedStatus) {
		connectServer();
	}
}, connectTimeout);

virshlistInterval = setInterval(function() {
	if (registerStatus) {
		virshlistUpdate();
	}
}, virshlistTimeout);