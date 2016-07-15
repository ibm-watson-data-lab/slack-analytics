'use strict';

// Slack regex definitions
var mention_re = /<@([a-zA-Z0-9]+)[\v\S]*>/g;			// <@U04DL7WU|some.id>
var channel_re = /<!([a-zA-Z0-9]+)[\v\S]*>/g;			// <!here>
var channel_links_re = /<#([a-zA-Z0-9]+)>/g;			// <#U05DL8WT>
var emoji_re = /:([a-z0-9_\-]+):/g;					    // :frown: (Custom emoji names can only contain lower case letters, numbers, dashes and underscores)

/**
 * Extracts Slack metadata from a message text
 * @param {Object} slackUserMsgObj - must be an instance of UserMsg
 * @returns {Object} msgTextMetadataObj - Message metadata
 * @returns {string} user - internal ID of the user who created the message
 * @returns {string} plain_text - the plain message text 
 * @returns {string} mention[] - list of @ mentions in the message
 * @returns {string} channel[] - list of ! channel commands present in the message
 * @returns {string} channel_links[] - list of # channel links present in the message
 * @returns {string} emoji[] - list of :emoji: present in the message
 */
var parseMsgText = function(slackUserMsgObj) {

	if((!slackUserMsgObj) || (! slackUserMsgObj.isUserMsg()) || (! slackUserMsgObj.getText())){
		return null;	
	}

	var msgTextMetadataObj =  {
								user: slackUserMsgObj.getUser(),
								timestamp: slackUserMsgObj.getTimestamp(),
								plain_text: slackUserMsgObj.getText(), // TODO
								mention: [],						   // <@ID|name>, e.g. <@U123> Did you see that?
								channel: [],						   // <!channel>, e.g. <!here>: buckle up
								channel_mention: [],				   // <#channel_id>, e.g. check in <#general>
								emoji:  [],			                   // :emoji:
							  };

	var match = null;
	while((match = mention_re.exec(slackUserMsgObj.getText())) !== null) {
		msgTextMetadataObj.mention.push(match[1]);
	}

	while((match = channel_re.exec(slackUserMsgObj.getText())) !== null) {
		msgTextMetadataObj.channel.push(match[1]);
	}

	while((match = channel_links_re.exec(slackUserMsgObj.getText())) !== null) {
		msgTextMetadataObj.channel_mention.push(match[1]);
	}

	while((match = emoji_re.exec(slackUserMsgObj.getText())) !== null) {
//console.log('Emoji: ' + match[1] + '<-- ' + slackUserMsgObj.getText());	// TODO	
		msgTextMetadataObj.emoji.push(match[1]);
	}

	return msgTextMetadataObj;

};

module.exports.parseMsgText = parseMsgText;