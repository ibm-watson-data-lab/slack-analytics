'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');


var PinnedItemMsg = function(_user, _itemType, _item, _attachments, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'pinned_item', consts.USER_ACTION_MSG_CLASS);

	var item = _item;
	var itemType = _itemType;
	var attachments = attachments;

	this.getItemType = function() {
		return itemType;
	};

	this.getItem = function() {
		return item;
	};

	this.getAttachments = function() {
		return attachments;
	};

};

util.inherits(PinnedItemMsg, userMsg);

module.exports = PinnedItemMsg;