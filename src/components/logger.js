var log4js = require('log4js');
var COMMON_CONFIG = require('../config/config').COMMON_CONFIG;

log4js.configure({
  appenders: [{
    type: 'console'
  }, {
    type: 'file',
    filename: COMMON_CONFIG.LOG_PATH,
    pattern: '_yyyy-MM-dd',
    maxLogSize: 20480,
    alwaysIncludePattern: false,
    backups: 10,
    category: ['normal', 'server', 'client', 'mysql']
  }],
  replaceConsole: false
});

log4js.getLogger('normal').setLevel('DEBUG');
log4js.getLogger('server').setLevel('DEBUG');
log4js.getLogger('client').setLevel('DEBUG');
log4js.getLogger('mysql').setLevel('DEBUG');
//log4js.getLogger('normal').setLevel('INFO');
//log4js.getLogger('server').setLevel('INFO');
//log4js.getLogger('client').setLevel('INFO');
//log4js.getLogger('mysql').setLevel('INFO');

module.exports.normal = log4js.getLogger('normal');
module.exports.server = log4js.getLogger('server');
module.exports.client = log4js.getLogger('client');
module.exports.mysql = log4js.getLogger('mysql');