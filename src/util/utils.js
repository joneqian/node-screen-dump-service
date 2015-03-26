/**
 * Created by qianqing on 14-3-4.
 */
var utils = module.exports;

/*
* check and invoke callback function
* */
utils.invokeCallback = function(cb){
    if(!!cb && typeof cb === 'function'){
        cb.apply(null,Array.prototype.slice.call(arguments,1));
    }
};

/*
* clone an object
* */
utils.clone = function(origin){
    if(!origin){
        return;
    }

    var obj = {};
    for(var f in origin){
        if(origin.hasOwnProperty(f)){
            obj[f] = origin[f];
        }
    }

    return obj;
};

/*
* get object size
* */
utils.size = function(obj){
    if(!obj){
        return 0;
    }

    var size = 0;
    for(var f in obj){
        if(obj.hasOwnProperty(f)){
            size++;
        }
    }

    return size;
};

/**
 * convert Date as  yyyy-mm-dd hh:mm:ss
 */
utils.formatTime = function formatTime(date) {
    var y = date.getFullYear();
    var M = date.getMonth() + 1;
    var d = date.getDate();
    var h = date.getHours();
    var m = date.getMinutes();
    var s = date.getSeconds();
    var mytimes = y+ "-" + M + "-" + d + " " + h + ':' + m + ':' + s;
    return mytimes;
};

/**
 * convert Date as  yyyy-mm-dd hh:mm:ss:ms
 */
utils.formatTime4MS = function formatTime(date) {
    var y = date.getFullYear();
    var M = date.getMonth() + 1;
    var d = date.getDate();
    var h = date.getHours();
    var m = date.getMinutes();
    var s = date.getSeconds();
    var ms = date.getMilliseconds();
    var mytimes = y+ "-" + M + "-" + d + " " + h + ':' + m + ':' + s + ':' + ms;
    return mytimes;
};

/**
 * transform unicode to utf8
 */
utils.unicodeToUtf8 = function(str) {
    var i, len, ch;
    var utf8Str = "";
    len = str.length;
    for (i = 0; i < len; i++) {
        ch = str.charCodeAt(i);

        if ((ch >= 0x0) && (ch <= 0x7F)) {
            utf8Str += str.charAt(i);

        } else if ((ch >= 0x80) && (ch <= 0x7FF)) {
            utf8Str += String.fromCharCode(0xc0 | ((ch >> 6) & 0x1F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x800) && (ch <= 0xFFFF)) {
            utf8Str += String.fromCharCode(0xe0 | ((ch >> 12) & 0xF));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x10000) && (ch <= 0x1FFFFF)) {
            utf8Str += String.fromCharCode(0xF0 | ((ch >> 18) & 0x7));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x200000) && (ch <= 0x3FFFFFF)) {
            utf8Str += String.fromCharCode(0xF8 | ((ch >> 24) & 0x3));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x4000000) && (ch <= 0x7FFFFFFF)) {
            utf8Str += String.fromCharCode(0xFC | ((ch >> 30) & 0x1));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 24) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        }

    }
    return utf8Str;
};

utils.isIP =function isIP(ip) {   
    var re =  /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/   
    return re.test(ip);   
} ;