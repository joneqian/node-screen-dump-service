exports.Config = {
	LOG_PATH: process.cwd() + '/logs/log',
	SCREEN_DUMP_PORT: 1201,
	VIRTUAL_LIST_PATH: '/home/qianqing/src/node-static-file-service/src/assets/device_catalog/virtual_list.json',
	VIRTUAL_DUMP_PATH: '/home/qianqing/src/node-static-file-service/src/assets/screen_dump/'
};

exports.COMMAND = {
	REGISTER_REQ: 1,
	REGISTER_RES: 2,
	UPDATE_VIRTUAL_LIST: 3,
	UPDATE_VIRTUAL_DUMP:4
};

exports.KEY = 'sanlogic';