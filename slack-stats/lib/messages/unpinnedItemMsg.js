'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');


var UnpinnedItemMsg = function(_user, _itemType, _item, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'unpinned_item', consts.USER_ACTION_MSG_CLASS);

	var item = _item;
	var itemType = _itemType;

	this.getItemType = function() {
		return itemType;
	};

	this.getItem = function() {
		return item;
	};

};

util.inherits(UnpinnedItemMsg, userMsg);

module.exports = UnpinnedItemMsg;