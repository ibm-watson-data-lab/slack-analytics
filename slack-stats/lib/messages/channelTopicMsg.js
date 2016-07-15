'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var ChannelTopicMsg = function(_user, _topic, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'channel_topic', consts.USER_ACTION_MSG_CLASS);

	var topic = _topic;

	this.getTopic = function() {
		return topic;
	};

};

util.inherits(ChannelTopicMsg, userMsg);

module.exports = ChannelTopicMsg;