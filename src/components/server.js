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
var MySql_Pool = require('./mysql_pool');
var dbPool = new MySql_Pool(SERVER_CONFIG.MYSQL_DB);
var ItemProvider = require('./ItemProvider').ItemProvider;
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var utils = require('../util/utils');

var mongodb = new Db(COMMON_CONFIG.MONGODB.database, new Server(COMMON_CONFIG.MONGODB.host, COMMON_CONFIG.MONGODB.port,
	{auto_reconnect:true, poolSize:COMMON_CONFIG.MONGODB.poolSize}));

var virtual_list = {};
var socket_map = new Array();

process.on('uncaughtException', function(error) {
	logger_server.error('Caught Exception:server(' + process.pid + ') ' + error);
});

process.on('exit', function (code) {
	dbPool.stop();
	mongodb.close();
});

process.on('SIGINT', function (code) {
	dbPool.stop();
	mongodb.close();
	process.exit(0);
});

dbPool.run();

var itemProvider = new ItemProvider(mongodb);

mongodb.open(function(err) {
	if (err) {
		logger_server.error(err);
		process.exit(-1);
	}

	worker.on('message', function(data, from, pid) {

	});

	worker.ready(function(socket, which) {
		server.emit('connection', socket);
	});

	worker.on('suicide', function(by) {
		logger_server.info('suicide by ' + by);
	});

	var server = require('net').createServer(function(socket) {

		var recBuffer = new ExBuffer().uint32Head().bigEndian();
		recBuffer.on('data', function(data) {
			packet.unpack(data, function(error, command, buf) {
				if (error) {
					logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') unpack error:' + error);
					socket.destroy();
					return;
				}

				switch (command) {
					case COMMAND.REGISTER_REQ:
						processRegister(buf, function(isOK, key){
							var sendBuf = new ByteBuffer().encoding('utf8').bigEndian();
							var send = sendBuf.ushort(isOK).pack();
							sendBuf = null;

							packet.pack(COMMAND.REGISTER_RES, send, function(error, buf) {
								if (error) {
									logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') pack error:' + error);
									socket.destroy();
									return;
								}
								socket.write(buf);
								buf = null;

								if (isOK) {
									socket_map[socket] = key;
								} else {
									socket.destroy();
								}
							});
						});
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
				buf = null;
			});
		});
		// 我们获得一个连接 - 该连接自动关联一个socket对象
		console.log('CONNECTED: ' + socket.remoteAddress + ':' + socket.remotePort);

		// 为这个socket实例添加一个"data"事件处理函数
		socket.on('data', function(data) {
			recBuffer.put(data);
		});

		// 为这个socket实例添加一个"end"事件处理函数
		socket.on('end', function(data) {

		});

		// 为这个socket实例添加一个"close"事件处理函数
		socket.on('close', function() {
			delete virtual_list[socket_map[socket]];
			delete socket_map[socket];
			recBuffer = null;
			saveVirtualList();
		});

		// 为这个socket实例添加一个"error"事件处理函数
		socket.on('error', function(error) {
			logger_server.error('server(' + process.pid + ') socket(' + socket.remoteAddress + ':' + socket.remotePort + ') error:' + error);
		});

	});

});

function checkSocket(socket) {
	return socket_map[socket] ? socket_map[socket]:undefined;
}

function processRegister(data, cb) {
	var recBuf = new ByteBuffer(data).encoding('utf8').bigEndian();
	//get key len
	var len = recBuf.ushort().unpack();
	//get key array, [0] is key len,[1] is key string
	var recArr = recBuf.byteArray(null, len[0]).unpack();
	var key = new Buffer(recArr[1]);
	var keys = key.toString().split('@@');
	recBuf = null;
	key = null;
	if (keys.length === 2 && keys[0] === COMMON_CONFIG.KEY) {
		mongodb.collection(keys[1], function (error, collection) {
			if (error) {
				logger_server.log('mongodb error:' + error);
				utils.invokeCallback(cb, 0, undefined);
				return;
			}

			collection.stats(function(err, result){
				if (err)
				{
					if (err['ok'] === 0 && err['errmsg'].indexOf('not found') !== -1){
						mongodb.createCollection('item', {capped: true, autoIndexId: true,
								size: COMMON_CONFIG.MONGODB.collection_size, max: COMMON_CONFIG.MONGODB.collection_max},
							function(err, collection){
							if(err){
								logger_server.log('mongodb create collection err:' + err);
								utils.invokeCallback(cb, 0, undefined);
								return;
							}
							utils.invokeCallback(cb, 1, keys[1]);
						});
					}
					utils.invokeCallback(cb, 0, undefined);
					return;
				}
				utils.invokeCallback(cb, 1, keys[1]);
			});
		});
	} else {
		utils.invokeCallback(cb, 0, undefined);
	}
}

function processVirtualList(socket, data) {
	if (checkSocket(socket) === undefined) {
		socket.destroy();
		return;
	}
	var recv_bytebuf = new ByteBuffer(data).encoding('utf8').bigEndian();
	var len = recv_bytebuf.ushort().unpack();
	var recv_arr = recv_bytebuf.byteArray(null, len[0]).unpack();
	recv_bytebuf = null;

	try {
		var buf = new  Buffer(recv_arr[1]);
		/*virtual_list[socket_map[socket]] = JSON.parse(buf.toString());
		saveVirtualList();*/
		var vir_info = JSON.parse(buf.toString());
		buf = null;
		var virtual = virtual_list[socket_map[socket]];
		var sql = 'select b.name as name,c.username as user from SYS_VM_USER a,SYS_VM b,SYS_USER c' +
			' where a.vm_id=b.id and a.user_id=c.id and b.name in (';
		var sql_filter = '';
		if (virtual === undefined) {
			for (var i in vir_info) {
				sql_filter = sql_filter + '\''+ i + '\'' + ',';
			}
		} else {
			for (var i in vir_info) {
				if (virtual[i].user === undefined || virtual[i].user === '') {
					sql_filter = sql_filter + '\'' + i + '\'' + ',';
				} else {
					vir_info[i].user = virtual[i].user;
				}
			}
		}

		if (sql_filter.length > 0){
			sql = sql + sql_filter.substring(0,sql_filter.length-1) + ')';
			dbPool.query(sql, function (error, rows) {
				if (error) {
					logger_server.error('mysql error:' + error);
				} else {
					for(var i = 0; i < rows.length; i++){
						vir_info[rows[i].name].user = rows[i].user;
					}
				}
				virtual_list[socket_map[socket]] = vir_info;
				saveVirtualList();
			});
		} else {
			virtual_list[socket_map[socket]] = vir_info;
			saveVirtualList();
		}

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
	var opt = { flags: 'w', encoding: null,fd: null, mode: 0666, autoClose: true};
	var write_stream = fs.createWriteStream(SERVER_CONFIG.VIRTUAL_LIST_PATH, opt);
	rs.pipe(write_stream);
	rs = null;
}

function processVirtualDump(socket, data) {
	var key = checkSocket(socket);
	if (key === undefined) {
		socket.destroy();
		return;
	}

	var recBuf = new ByteBuffer(data).encoding('utf8').bigEndian();
	var len = recBuf.ushort().uint32().unpack();
	var recArr = recBuf.byteArray(null, len[0]).byteArray(null, len[1]).unpack();
	recBuf = null;

	var fileName = new Buffer(recArr[2]);
	var rs = new Readable;
	var buf = new Buffer(recArr[3], 'utf8');
	rs.push(buf);
	rs.push(null);
	var opt = { flags: 'w', encoding: null,fd: null, mode: 0666, autoClose: true};
	var writeStream = fs.createWriteStream(SERVER_CONFIG.VIRTUAL_DUMP_PATH + fileName, opt);
	rs.pipe(writeStream);
	rs = null;


	var item = {};
	item.type = 'image/jpeg';
	item.imgData = buf;
	item.ts = new Date();
	itemProvider.save(key, item, function (err, item) {
		if(err){
			logger_server.error('mongodb error:' + err);
		}
		fileName = null;
		buf = null;
	});
}