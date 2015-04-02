var path = require('path');

exports.CLIENT_CONFIG = {
	SCREENSHOT_PATH: path.dirname(__dirname) + '/screenshot_file/',
	VIRSH_LIST_SHELL: path.dirname(__dirname) + '/shell/virsh_list.py',
	VIRSH_SCREN_SHELL: path.dirname(__dirname) + '/shell/virsh_screen.py'
};

exports.SERVER_CONFIG = {
	VIRTUAL_LIST_PATH: '/home/qianqing/src/node-static-file-service/src/assets/device_catalog/virtual_list.json',
	VIRTUAL_DUMP_PATH: '/home/qianqing/src/node-static-file-service/src/assets/screen_dump/'
};

exports.COMMON_CONFIG = {
	LOG_PATH: path.dirname(__dirname) + '/logs/log',
	SCREEN_DUMP_PORT: 1201,
	SCREEN_DUMP_HOST: '127.0.0.1',
	KEY: 'sanlogic'
};

exports.COMMAND = {
	REGISTER_REQ: 1,
	REGISTER_RES: 2,
	UPDATE_VIRTUAL_LIST: 3,
	UPDATE_VIRTUAL_DUMP:4
};