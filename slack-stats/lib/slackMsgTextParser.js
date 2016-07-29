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

// Slack regex definitions
const mention_re = /<@([a-zA-Z0-9]+)[\v\S]*>/g;			// <@U04DL7WU|some.id>      extracts ---> U04DL7WU 
const channel_re = /<!([a-zA-Z0-9]+)([\S]*)>/g;			// <!here> or <!here|@here> extracts ---> here
const channel_links_re = /<#([a-zA-Z0-9]+)>/g;			// <#U05DL8WT>				extracts ---> U05DL8WT
const emoji_re = /:([a-z0-9_\-]+):/g;					// :frown: (Custom emoji names can only contain lower case letters, numbers, dashes and underscores) extracts ---> frown
const url_re = /<(http|https|ftp|ftps):\/\/[\S]+>/gi;	// <http://...> <https://...> <ftp://...> <ftps://...>
const mailto_re = /<mailto:[\S]+>/gi;					// <mailto:somebody@somecompany.com|somebody>
const phone_re = /<tel:[\S]+>/gi;						// <tel:888-426-6840|888-426-6840>
const code_re = /``?`?[^`]+``?`?/g;						// ... code snippets ``` system.out.println('Hello world');``` ... code fragments `package.json`
const markdown_re = /[\*_~]/g;							// ... bold: *text* ... italics: _text_ ... strikethrough: ~done~

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

	if((!slackUserMsgObj) || (! slackUserMsgObj.isUserMsg())) { 
		return null;	
	}

	var msgTextMetadataObj =  {
								user: slackUserMsgObj.getUser(),
								timestamp: slackUserMsgObj.getTimestamp(),
								plain_text: slackUserMsgObj.getText(), // 
								mention: [],						   // <@ID|name>, e.g. <@U123> Did you see that?
								channel: [],						   // <!channel>, e.g. <!here>: buckle up
								channel_mention: [],				   // <#channel_id>, e.g. check in <#general>
								emoji:  [],			                   // :emoji:
							  };

	var match = null;

	// store (and remove) mentions
	while((match = mention_re.exec(slackUserMsgObj.getText())) !== null) {
		msgTextMetadataObj.mention.push(match[1]);
		msgTextMetadataObj.plain_text = msgTextMetadataObj.plain_text.replace('<@' + match[1] + '>','');
	}

	// store (and remove) channel commands
	while((match = channel_re.exec(slackUserMsgObj.getText())) !== null) {
		msgTextMetadataObj.channel.push(match[1]);
		msgTextMetadataObj.plain_text = msgTextMetadataObj.plain_text.replace('<!' + match[1] + match[2] + '>','');
	}

	// store (and remove) channel references
	while((match = channel_links_re.exec(slackUserMsgObj.getText())) !== null) {
		msgTextMetadataObj.channel_mention.push(match[1]);
		msgTextMetadataObj.plain_text = msgTextMetadataObj.plain_text.replace('<#' + match[1] + '>','');
	}

	// store (and remove) emoji
	while((match = emoji_re.exec(slackUserMsgObj.getText())) !== null) {
		msgTextMetadataObj.emoji.push(match[1]);
		msgTextMetadataObj.plain_text = msgTextMetadataObj.plain_text.replace(':' + match[1] + ':','');
	}

	// remove URL references
	msgTextMetadataObj.plain_text = msgTextMetadataObj.plain_text.replace(url_re,'');

	// remove mailto references
	msgTextMetadataObj.plain_text = msgTextMetadataObj.plain_text.replace(mailto_re,'');

	// remove phone number references
	msgTextMetadataObj.plain_text = msgTextMetadataObj.plain_text.replace(phone_re,'');
	
	// remove code artifacts
	// ... code snippets ``` system.out.println('Hello world');``` ... code fragments `package.json`
	msgTextMetadataObj.plain_text = msgTextMetadataObj.plain_text.replace(code_re,'');

	// remove markdown characters and trim leading/trailing spaces
	// ... bold: *text* ... italics: _text_ ... strikethrough: ~done~
	msgTextMetadataObj.plain_text = msgTextMetadataObj.plain_text.replace(markdown_re,'').trim();

	return msgTextMetadataObj;

};

module.exports.parseMsgText = parseMsgText;