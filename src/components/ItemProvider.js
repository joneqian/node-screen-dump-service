/**
 * Created by qianqing on 15-5-12.
 */
var ObjectID = require('mongodb').ObjectID;
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
            callback(error)
        else {
            collection.insert(item, function () {
                callback(null,item);
            });
        }
    });
};

ItemProvider.prototype.find = function (collName, filter, col, sort, callback) {
    this.getCollection(collName, function (error, collection) {
        if (error) callback(error)
        else {
            collection.find(filter, col, sort).toArray(function(err, documents) {
                callback(null,documents);
            });
        }
    });
};

exports.ItemProvider = ItemProvider;