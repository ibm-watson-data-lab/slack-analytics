'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var BotDisableMsg = function(_user, _botId, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'bot_disable', consts.USER_ACTION_MSG_CLASS);

	var botId = _botId;

	this.getBotId = function() {
		return botId;
	};

};

util.inherits(BotDisableMsg, userMsg);

module.exports = BotDisableMsg;