'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var ChannelUnArchiveMsg = function(_user, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'channel_unarchive', consts.USER_ACTION_MSG_CLASS);

};

util.inherits(ChannelUnArchiveMsg, userMsg);

module.exports = ChannelUnArchiveMsg;