'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var UserStatusMsg = function(_user, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'me_message', consts.USER_ACTION_MSG_CLASS);

};

util.inherits(UserStatusMsg, userMsg);

module.exports = UserStatusMsg;