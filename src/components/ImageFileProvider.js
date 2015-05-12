/**
 * Created by qianqing on 15-5-12.
 */

var ObjectID = require('mongodb').ObjectID;
var GridStore = require('mongodb').GridStore;
ImageFileProvider = function (db) {
    this.db = db
};

ImageFileProvider.prototype.insert = function (data, callback) {
//process.nextTick(function(){
    var gridStore = new GridStore(this.db, new ObjectID(),'w', {"content_type":"image/jpeg","chunk_size":data.length});
    gridStore.open(function (err, gridStore) {
        gridStore.write(data, function () {
            gridStore.close(function (err, result) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('insert ok.');
                    callback(result);
                }
            });
        });
    });
//});
};

ImageFileProvider.prototype.read = function (fileId, callback) {
    console.log('read ...'+fileId);
    var gridStore = new GridStore(this.db, new ObjectID(fileId));
    console.log('gridStore ...'+gridStore);
    gridStore.open(function (err, gridStore) {
        if(err){
            console.log(err);
        }else{
            console.log('open ...');
            gridStore.read(function (err, data) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('read ok');
                    callback(data);
                }
            });
        }
    });
};
exports.ImageFileProvider = ImageFileProvider;