'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var ChannelArchiveMsg = function(_user, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'channel_archive', consts.USER_ACTION_MSG_CLASS);

};

util.inherits(ChannelArchiveMsg, userMsg);

module.exports = ChannelArchiveMsg;