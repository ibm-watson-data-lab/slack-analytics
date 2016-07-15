'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var ChannelNameMsg = function(_user, _name, _oldName, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'channel_name', consts.USER_ACTION_MSG_CLASS);

	var name = _name;
	var oldName = _oldName;

	this.getName = function() {
		return name;
	};

	this.getOldName = function() {
		return oldName;
	};

};

util.inherits(ChannelNameMsg, userMsg);

module.exports = ChannelNameMsg;