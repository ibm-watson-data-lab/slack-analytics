'use strict';

var util = require('util');
var basicMsg = require('./basicMsg.js'),
    consts = require('./consts.js');

var BotMsg = function(_botId, _markDown, _attachments, _text, _timestamp) {

	basicMsg.call(this, _text, _timestamp, 'bot_message', consts.BOT_MSG_CLASS);

	var botId = _botId;
	var markDown = _markDown;
	var attachments = _attachments;

	this.getBotId = function() {
		return botId;
	};

	this.getIsMarkDown = function() {
		return markDown;
	};

	this.getAttachments = function() {
		return attachments;
	};

};

util.inherits(BotMsg, basicMsg);

module.exports = BotMsg;