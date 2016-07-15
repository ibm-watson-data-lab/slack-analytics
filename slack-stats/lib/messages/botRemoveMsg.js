'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var BotRemoveMsg = function(_user, _botId, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'bot_remove', consts.USER_ACTION_MSG_CLASS);

	var botId = _botId;

	this.getBotId = function() {
		return botId;
	};

};

util.inherits(BotRemoveMsg, userMsg);

module.exports = BotRemoveMsg;