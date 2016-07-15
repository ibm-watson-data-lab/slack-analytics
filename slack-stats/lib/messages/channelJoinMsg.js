'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var ChannelJoinMsg = function(_user, _inviter, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'channel_join', consts.USER_ACTION_MSG_CLASS);

	var inviter = _inviter;

	this.getInviter = function() {
		return inviter;
	};

};

util.inherits(ChannelJoinMsg, userMsg);

module.exports = ChannelJoinMsg;