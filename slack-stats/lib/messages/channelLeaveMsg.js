'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var ChannelLeaveMsg = function(_user, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'channel_leave', consts.USER_ACTION_MSG_CLASS);

};

util.inherits(ChannelLeaveMsg, userMsg);

module.exports = ChannelLeaveMsg;