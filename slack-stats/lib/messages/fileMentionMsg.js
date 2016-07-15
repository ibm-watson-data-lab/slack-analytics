'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');


var FileMentionMsg = function(_user, _file, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'file_mention', consts.USER_ACTION_MSG_CLASS);

	var file = _file;

	this.getFile = function() {
		return file;
	};

};

util.inherits(FileMentionMsg, userMsg);

module.exports = FileMentionMsg;