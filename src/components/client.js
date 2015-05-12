var worker = require('pm').createWorker();
var logger_client = require('./logger').client;
var exec = require('child_process').exec;
var fs = require('fs');
var COMMON_CONFIG = require('../config/config').COMMON_CONFIG;
var COMMAND = require('../config/config').COMMAND;
var CLIENT_CONFIG = require('../config/config').CLIENT_CONFIG;
var ExBuffer = require('../util/ExBuffer');
var packet = require('../util/package');
var ByteBuffer = require('../util/ByteBuffer');
var BufferHelper = require('../util/BufferHelper');

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

	client.connect(COMMON_CONFIG.SCREEN_DUMP_PORT, COMMON_CONFIG.SCREEN_DUMP_HOST, function() {
		logger_client.debug('connect to: ' + COMMON_CONFIG.SCREEN_DUMP_HOST + ':' + COMMON_CONFIG.SCREEN_DUMP_PORT);
		connectedStatus = true;
		exBuffer = null;
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
		connectedStatus = false;
	});

	// 为客户端添加“error”事件处理函数
	client.on('error', function(error) {
		logger_client.error('client(' + process.pid + ') tcp socket err:' + error);
	});
}

function sendRegisterReq() {
	var bytebuf = new ByteBuffer().encoding('utf8').bigEndian();
	var key = COMMON_CONFIG.KEY + '@@' + require("os").hostname();
	var buf_len = Buffer.byteLength(key);
	var buf = new Buffer(buf_len);
	buf.write(key);
	var sendbuf = bytebuf.ushort(buf_len).byteArray(buf, buf_len).pack();
	bytebuf = null;
	packet.pack(COMMAND.REGISTER_REQ, sendbuf, function(err, buf) {
		if (err) {
			logger_client.error('register pack error: ' + err);
			return;
		}

		client.write(buf);
		buf = null;
	});
}

function processRegister(data) {
	var recv_bytebuf = new ByteBuffer(data).encoding('utf8').bigEndian();
	var res = recv_bytebuf.ushort().unpack();
	recv_bytebuf = null;

	if (res[0] === 1) {
		registerStatus = true;
		logger_client.info('client(' + process.pid + ') register successfully.');
	} else {
		logger_client.error('client(' + process.pid + ') register fail.');
		registerStatus = false;
	}
}

function virshlistUpdate() {
	exec('python ' + CLIENT_CONFIG.VIRSH_LIST_SHELL, function(error, stdout, stderr) {
		if (error) {
			logger_client.error('client(' + process.pid + ') virshlistUpdate fail: ' + stderr);
			return;
		}
		var bytebuf = new ByteBuffer().encoding('utf8').bigEndian();
		var buf_len = Buffer.byteLength(stdout);
		var buf = new Buffer(buf_len);
		buf.write(stdout);
		var sendbuf = bytebuf.ushort(buf_len).byteArray(buf, buf_len).pack();
		bytebuf = null;
		buf = null;
		packet.pack(COMMAND.UPDATE_VIRTUAL_LIST, sendbuf, function(err, buf) {
			if (err) {
				logger_client.error('update virsh list pack error: ' + err);
				return;
			}

			client.write(buf);
			buf = null;
		});

	});
}

function virshscreenUpdate(cb) {
	exec('python ' + CLIENT_CONFIG.VIRSH_SCREN_SHELL + ' ' + CLIENT_CONFIG.SCREENSHOT_PATH, function(error, stdout, stderr) {
		if (error) {
			logger_client.error('client(' + process.pid + ') virshscreenUpdate fail: ' + stderr);
			return;
		}
		var screenshot_list = JSON.parse(stdout);
		for (var i = 0; i < screenshot_list.length; i++) {
			cb(screenshot_list[i]);
		}
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

virshscreenInterval = setInterval(function() {
	if (registerStatus) {
		virshscreenUpdate(function(fileName) {
			var opt = { flags: 'r', encoding: null,fd: null, mode: 0666, autoClose: true};
			var readStream = fs.createReadStream(CLIENT_CONFIG.SCREENSHOT_PATH + fileName, opt);
			var bufferHelper = new BufferHelper();

			readStream.on('data', function(chunk) { // 当有数据流出时，写入数据
				bufferHelper.concat(chunk);
			});

			readStream.on('end', function(chunk) { // 当有数据流出时，写入数据
				var bytebuf = new ByteBuffer().encoding('utf8').bigEndian();
				var fileData = bufferHelper.toBuffer();
				bufferHelper = null;

				var name_len = Buffer.byteLength(fileName);
				var namebuf = new Buffer(name_len);
				namebuf.write(fileName);

				var sendbuf = bytebuf.ushort(name_len).uint32(fileData.length).byteArray(namebuf, name_len).byteArray(fileData, fileData.length).pack();
				bytebuf = null;
				namebuf = null;
				packet.pack(COMMAND.UPDATE_VIRTUAL_DUMP, sendbuf, function(err, buf) {
					if (err) {
						console.error('pack error: ' + err);
						return;
					}
					client.write(buf);
					buf = null;
				});
			});
		});
	}
}, virshscreenTimeout);