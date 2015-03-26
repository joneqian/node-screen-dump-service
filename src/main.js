var logger_normal = require('./components/logger').normal;
var config = require('./config/config');
var utils = require("./util/utils");

var para_num_err = function() {
	console.log('Too many or little arguments given.');
	console.log("Use 'node main.js help'.");
	process.exit(0);
};

var para_unknown_err = function() {
	console.log("Unknown command.Plese run 'node main.js help' .");
	process.exit(0);
};

if (process.argv.length > 4 || process.argv.length < 3) {
	para_num_err();
};

var arg2 = process.argv[2];
global.SCREEN_DUMP_PORT = config.Config.SCREEN_DUMP_PORT;

if (arg2 == 'help') {
	console.log('screen dump service command:');
	console.log('help: node main.js help');
	console.log('run service: node main.js server [port]  ----  the default port is ' + config.Config.SCREEN_DUMP_PORT);
	console.log('run client: node main.js client remotehost[:port]  ----  the default port is ' + config.Config.SCREEN_DUMP_PORT);
	process.exit(0);
} else if (arg2 == 'server') {
	if (process.argv[3] !== undefined) {
		var arg3 = Number(process.argv[3]);
		if (!isNaN(arg3)) {
			global.SCREEN_DUMP_PORT = arg3;
		} else {
			para_unknown_err();
		}
	}
} else if (arg2 == 'client') {
	var arg3 = process.argv[3];
	if (arg3 === undefined) {
		para_num_err();
	}
	var remote_addr = arg3.split(':');
	if (remote_addr.length === 1 && utils.isIP(remote_addr[0])) {
		global.SCREEN_DUMP_HOST = remote_addr[0];
	} else if (remote_addr.length === 2 && utils.isIP(remote_addr[0]) && !isNaN(Number(remote_addr[1]))) {
		global.SCREEN_DUMP_HOST = remote_addr[0];
		global.SCREEN_DUMP_PORT = remote_addr[1];
	} else {
		para_unknown_err();
	}

} else {
	para_unknown_err();
}

var app = require('pm').createMaster({
	'pidfile': __dirname + 'screen-dump-service.pid',
	'statusfile': __dirname + 'status.log'
});

app.on('giveup', function(name, fatals, pause) {
	// YOU SHOULD ALERT HERE!
	logger_normal.info('[%s] [master:%s] giveup to restart "%s" process after %d times. pm will try after %d ms.',
		new Date(), process.pid, name, fatals, pause);
});

app.on('disconnect', function(name, pid) {
	var w = app.fork(name);
	logger_normal.error('[%s] [master:%s] worker:%s disconnect! new worker:%s fork',
		new Date(), process.pid, pid, w.process.pid);
});

app.on('fork', function(name, pid) {
	logger_normal.info('[%s] [master:%s] new %s:worker:%s fork',
		new Date(), process.pid, name, pid);
});

app.on('quit', function(name, pid, code, signal) {
	logger_normal.info('[%s] [master:%s] %s:worker:%s quit, code: %s, signal: %s',
		new Date(), process.pid, name, pid, code, signal);
});

app.register('assetService', __dirname + '/components/server.js', {
	'listen': [global.SCREEN_DUMP_PORT],
	'children': 2
});


app.dispatch();