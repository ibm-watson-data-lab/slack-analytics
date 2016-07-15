'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var ChannelPurposeMsg = function(_user, _purpose, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'channel_purpose', consts.USER_ACTION_MSG_CLASS);

	var purpose = _purpose;

	this.getPurpose = function() {
		return purpose;
	};

};

util.inherits(ChannelPurposeMsg, userMsg);

module.exports = ChannelPurposeMsg;