/**
 * Created by qianqing on 15-5-12.
 */
var ObjectID = require('mongodb').ObjectID;
var COMMON_CONFIG = require('../config/config').COMMON_CONFIG;

ItemProvider = function (db) {
    this.db = db;
};

ItemProvider.prototype.getCollection = function (collName, callback) {
    this.db.collection(collName, function (error, collection) {
        if (error)
            callback(error);
        else
            callback(null, collection);
    });
};

ItemProvider.prototype.save = function (collName, item, callback) {
    this.getCollection(collName, function (error, collection) {
        if (error)
            callback(error);
        else {
            collection.insert(item, {w:1}, function (err, result) {
                if (err) {
                    callback(err,result);
                } else {
                    callback(null,result);
                }
            });
        }
    });
};

ItemProvider.prototype.saveEX = function (collName, item, callback) {
    var db = this.db;
    this.getCollection(collName, function (error, collection) {
        if (error)
            callback(error);
        else {
            collection.stats(function(err, result){
                if (err) {
                    if (err['ok'] === 0 && err['errmsg'].indexOf('not found') !== -1){
                        db.createCollection(collName, {capped: true, autoIndexId: true,
                                size: COMMON_CONFIG.MONGODB.collection_size, max: COMMON_CONFIG.MONGODB.collection_max},
                            function(e, col){
                                if(e){
                                    callback(e);
                                    return;
                                }
                                col.insert(item, function () {
                                    callback(null,item);
                                });
                            });
                    } else {
                        callback(err);
                    }
                } else {
                    collection.insert(item, {w:1}, function (err, result) {
                        if (err) {
                            callback(err,result);
                        } else {
                            callback(null,result);
                        }
                    });
                }
            });
        }
    });
};

ItemProvider.prototype.find = function (collName, filter, col, sort, callback) {
    this.getCollection(collName, function (error, collection) {
        if (error) callback(error);
        else {
            collection.find(filter, col, sort).toArray(function(err, documents) {
                callback(null,documents);
            });
        }
    });
};

exports.ItemProvider = ItemProvider;