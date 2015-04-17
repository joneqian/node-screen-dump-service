/**
 * Created by qianqing on 15-4-16.
 */
var util = require(process.binding('natives').util ? 'util':'sys');
var utils = require('../util/utils');
var logger_mysql = require('./logger').mysql;
var mysql = require('mysql');

var MySql_Pool = function (config) {
    this.pool = undefined;
    this.config = config;
}

module.exports = MySql_Pool;

function handleError (err) {
    if (err) {
        logger_mysql.error('error code:' + err.code);
        logger_mysql.error(err.stack || err);
    }
}

MySql_Pool.prototype.run = function () {
    this.pool  = mysql.createPool(this.config);
    this.pool.on('connection', function (connection) {
        logger_mysql.info('mysql db is connected');
    });
    this.pool.on('error', handleError);
}

MySql_Pool.prototype.stop = function () {
    this.pool.end(handleError);
}

MySql_Pool.prototype.query = function(sql, cb) {
    this.pool.getConnection(function(err, connection) {
        if(err) {
            connection.release();
            utils.invokeCallback(cb, err, undefined);
            return;
        }

        // Use the connection
        connection.query(sql, function(error, rows) {
            // And done with the connection.
            connection.release();
            if(error) {
                utils.invokeCallback(cb, error, undefined);
                return;
            }
            utils.invokeCallback(cb, undefined, rows);
            // Don't use the connection here, it has been returned to the pool.
        });
    });
}
