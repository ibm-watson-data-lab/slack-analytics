//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2016
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------
'use strict';

var util = require('util');

var BasicMsg = require('./messages/basicMsg.js'),
	BotMsg = require('./messages/botMsg.js'),
	BotAddMsg = require('./messages/botAddMsg.js'),
	BotEnableMsg = require('./messages/botEnableMsg.js'),
	BotDisableMsg = require('./messages/botDisableMsg.js'),
	BotRemoveMsg = require('./messages/botRemoveMsg.js'),
	UserMsg = require('./messages/userMsg.js'),
	UserStatusMsg = require('./messages/userStatusMsg.js'),
	FileCommentMsg = require('./messages/fileCommentMsg.js'),
	FileMentionMsg = require('./messages/fileMentionMsg.js'),
	FileShareMsg = require('./messages/fileShareMsg.js'),
	ChannelArchiveMsg = require('./messages/channelArchiveMsg.js'),
	ChannelJoinMsg = require('./messages/channelJoinMsg.js'),
	ChannelLeaveMsg = require('./messages/channelLeaveMsg.js'),
	ChannelNameMsg = require('./messages/channelNameMsg.js'),
	ChannelPurposeMsg = require('./messages/channelPurposeMsg.js'),
	ChannelTopicMsg = require('./messages/channelTopicMsg.js'),
	ChannelUnArchiveMsg = require('./messages/channelUnArchiveMsg.js'),
	PinnedItemMsg = require('./messages/pinnedItemMsg.js'),
	ReminderAddMsg = require('./messages/reminderAddMsg.js'),
	UnpinnedItemMsg = require('./messages/unpinnedItemMsg.js');

/**
 * Basic Slack message parser.
 * @param {Object} slackMsgRecord - a slack message object
 * @return {Object} slackMsg - a sub-type of messages/basicMsg
 */
var parseMsg = function(slackMsgRecord) {

	var msg = null;

	if((!slackMsgRecord) || (!slackMsgRecord.type) || (slackMsgRecord.type !== 'message')) {
		return msg;	
	}

	// Reference: https://api.slack.com/events/message

	switch(slackMsgRecord.subtype) {

		case 'bot_add':     
							msg = new BotAddMsg(slackMsgRecord.user, slackMsgRecord.bot_id, slackMsgRecord.text, slackMsgRecord.ts); 
							break;
		case 'bot_enable':   
							msg = new BotEnableMsg(slackMsgRecord.user, slackMsgRecord.bot_id, slackMsgRecord.text, slackMsgRecord.ts); 
							break;	
		case 'bot_disable':   
							msg = new BotDisableMsg(slackMsgRecord.user, slackMsgRecord.bot_id, slackMsgRecord.text, slackMsgRecord.ts); 
							break;												
		case 'bot_message': 
							msg = new BotMsg(slackMsgRecord.bot_id, slackMsgRecord.mrkdwn, slackMsgRecord.attachments, slackMsgRecord.text, slackMsgRecord.ts); 
							break;
		case 'bot_remove':     
							msg = new BotRemoveMsg(slackMsgRecord.user, slackMsgRecord.bot_id, slackMsgRecord.text, slackMsgRecord.ts); 
							break;
		case 'channel_archive': 
							msg = new ChannelArchiveMsg(slackMsgRecord.user, slackMsgRecord.text, slackMsgRecord.ts); 
							break;
		case 'channel_join':	
							msg = new ChannelJoinMsg(slackMsgRecord.user, slackMsgRecord.inviter, slackMsgRecord.text, slackMsgRecord.ts);
							break;							
		case 'channel_leave':
							msg = new ChannelLeaveMsg(slackMsgRecord.user, slackMsgRecord.text, slackMsgRecord.ts);
							break;							
		case 'channel_name':
							msg = new ChannelNameMsg(slackMsgRecord.user, slackMsgRecord.name, slackMsgRecord.old_name, slackMsgRecord.text, slackMsgRecord.ts);
							break;		
		case 'channel_purpose':
							msg = new ChannelPurposeMsg(slackMsgRecord.user, slackMsgRecord.purpose, slackMsgRecord.text, slackMsgRecord.ts);
							break;							
		case 'channel_topic':
							msg = new ChannelTopicMsg(slackMsgRecord.user, slackMsgRecord.topic, slackMsgRecord.text, slackMsgRecord.ts);
							break;
		case 'channel_unarchive': 
							msg = new ChannelUnArchiveMsg(slackMsgRecord.user, slackMsgRecord.text, slackMsgRecord.ts); 
							break;
		case 'file_comment':
							msg = new FileCommentMsg(slackMsgRecord.comment.user, slackMsgRecord.file, slackMsgRecord.comment.comment, slackMsgRecord.ts);
							break;
		case 'file_mention':
							msg = new FileMentionMsg(slackMsgRecord.user, slackMsgRecord.file,  slackMsgRecord.text, slackMsgRecord.ts); 
							break;
		case 'file_share':
							msg = new FileShareMsg(slackMsgRecord.user, slackMsgRecord.file, slackMsgRecord.text, slackMsgRecord.ts);
							break;
		case 'me_message':
							msg = new UserStatusMsg(slackMsgRecord.user, slackMsgRecord.text, slackMsgRecord.ts);
							break;
		case 'pinned_item':
							msg = new PinnedItemMsg(slackMsgRecord.user, slackMsgRecord.item_type, slackMsgRecord.item, slackMsgRecord.attachments, slackMsgRecord.text, slackMsgRecord.ts);
							break;
		case 'unpinned_item':
							msg = new UnpinnedItemMsg(slackMsgRecord.user, slackMsgRecord.item_type, slackMsgRecord.item, slackMsgRecord.text, slackMsgRecord.ts);
							break;							
		case 'reminder_add':
							msg = new ReminderAddMsg(slackMsgRecord.user, slackMsgRecord.text, slackMsgRecord.ts);
							break;	
						
		default:
					if(slackMsgRecord.subtype) {
						console.error('Parser issue: Unknown subtype ' + slackMsgRecord.subtype);
						console.error('FFDC: ' + util.inspect(slackMsgRecord,5));
						msg = new BasicMsg(slackMsgRecord.text, slackMsgRecord.ts);
					}
					else {
						if(slackMsgRecord.user) {
							msg = new UserMsg(slackMsgRecord.user, slackMsgRecord.text, slackMsgRecord.ts);	
						}
						else {
							msg = new BasicMsg(slackMsgRecord.text, slackMsgRecord.ts);		
						}
						
					}
					
	}

	return msg;

};

module.exports.parseMsg = parseMsg;