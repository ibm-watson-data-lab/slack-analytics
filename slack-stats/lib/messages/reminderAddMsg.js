'use strict';

var util = require('util');
var userMsg = require('./userMsg.js'),
    consts = require('./consts.js');

var ReminderAddMsg = function(_user, _text, _timestamp) {

	userMsg.call(this, _user, _text, _timestamp, 'reminder_add', consts.USER_ACTION_MSG_CLASS);

};

util.inherits(ReminderAddMsg, userMsg);

module.exports = ReminderAddMsg;