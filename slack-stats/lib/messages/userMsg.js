'use strict';

var util = require('util');
var basicMsg = require('./basicMsg.js'),
    consts = require('./consts.js');

var UserMsg = function(_user, _text, _timestamp, _type, _msgClass) {

	basicMsg.call(this, _text, _timestamp, _type || 'user', _msgClass || consts.USER_MSG_CLASS);

	var user = _user;

	this.getUser = function() {
		return user;
	};

};

util.inherits(UserMsg, basicMsg);

module.exports = UserMsg;