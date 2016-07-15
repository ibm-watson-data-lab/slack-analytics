'use strict';

var consts = require('./consts.js');

/**
 *
 *
 */
var BasicMsg = function (_text, _timestamp, _type, _msgClass) {

	var type = _type || 'unknown';
	var timestamp = _timestamp;
	var text = _text; 
	var msgClass = _msgClass || consts.UNKNOWN_MSG_CLASS;

	this.getText = function() {
		return text;
	};

	this.getTimestamp = function() {
		return timestamp;
	};

	this.getMsgType = function() {
		return type;
	};

	this.isUnknownMsg = function() {
		return msgClass === consts.UNKNOWN_MSG_CLASS;
	};

	this.isSysMsg = function() {
		return (msgClass === consts.SYSTEM_MSG_CLASS) || (msgClass === consts.USER_ACTION_MSG_CLASS);
	};

	this.isUserMsg = function() {
		return msgClass === consts.USER_MSG_CLASS;
	};

	this.isUserActionMsg = function() {
		return msgClass === consts.USER_ACTION_MSG_CLASS;
	};

	this.isBotMsg = function() {
		return msgClass === consts.BOT_MSG_CLASS;
	};

};

module.exports = BasicMsg;
