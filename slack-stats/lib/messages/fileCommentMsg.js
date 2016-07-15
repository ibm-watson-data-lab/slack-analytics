'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');


var FileCommentMsg = function(_user, _file, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'file_comment', consts.USER_MSG_CLASS);

	var file = _file;

	this.getFile = function() {
		return file;
	};

};

util.inherits(FileCommentMsg, userMsg);

module.exports = FileCommentMsg;