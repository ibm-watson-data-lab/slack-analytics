'use strict';

var _ = require('lodash');

/**
 * Encapsulates Slack channel statistics 
 * @param {string} _channelName - slack channel name
 */
var UserMsgStatistics = function (_channelName) {

	var channelName = _channelName;

	var channelStats = {
							total_messages: 0,
							first_message_timestamp: null,	// unix style (e.g. 1430746612) + ".<some_numbers>"
							last_message_timestamp: null	// unix style (e.g. 1430746612) + ".<some_numbers>"
					   },
	    userMsgStats = {
	    					total: 0,
							data: {}	    					
									/* one entry per user 
									    {
									    		message_count: 0        // total number of messages for this user
												mention: {},		    // <@ID|name>, e.g. <@U123> Did you see that?
												channel: {},		    // <!channel>, e.g. <!here>: buckle up
												channel_mention: {},	// <#channel_id>, e.g. check in <#general>
												emoji:  {},			    // :emoji:								
										}
									*/
					},
		mentionStats = {						// users that are called out most frequently
								total: 0,		// total for this channel	
								data: {}		// one entry {<user ID>: <mention count>} per user ID
					 		},
		channelLinksStats = {					// channels that are linked to most frequently
								total: 0,		// total for this channel
								data: {}		// one entry {<channel ID>: <link count>} per channel
					 		},
		emojiStats = {							// emojis that are used most frequently
						total: 0,				// total for this channel
						data: {}				// one entry {<emoji name>: <use count>} per emoji
					 };			
					
	/**
	 * Updates references statistics (mentions, ...)
	 * @param {Object} msgTextMetadataObj - 
	 * @param {string} plain_text - the plain message text 
 	 * @param {string} plain_text - the plain message text 
 	 * @param {string} mention[] - list of @ mentions in the message
 	 * @param {string} channel[] - list of ! channel commands present in the message
 	 * @param {string} channel_mention[] - list of # channel links present in the message
 	 * @param {string} emoji[] - list of :emoji: present in the message
	 * 
	 */
	this.update = function(msgTextMetadataObj) {

		// input to process?
		if(!msgTextMetadataObj) {
			return;
		}

		// increase message count
		channelStats.total_messages++;

		// track first and last message timestamp information
		if((!channelStats.first_message_timestamp) || (msgTextMetadataObj.timestamp.localeCompare(channelStats.first_message_timestamp) === -1)) {			
			channelStats.first_message_timestamp = msgTextMetadataObj.timestamp;
		}

		if((!channelStats.last_message_timestamp) || (msgTextMetadataObj.timestamp.localeCompare(channelStats.last_message_timestamp) === 1)) {	
			channelStats.last_message_timestamp = msgTextMetadataObj.timestamp;
		}

		// increase message count
		userMsgStats.total++;

		if(! userMsgStats.data.hasOwnProperty(msgTextMetadataObj.user)) {
			userMsgStats.data[msgTextMetadataObj.user] = {
															message_count: 0,		// total number of messages for this user
															mention: {},		    // <@ID|name>, e.g. <@U123> Did you see that?
															channel: {},		    // <!channel>, e.g. <!here>: buckle up
															channel_mention: {},	// <#channel_id>, e.g. check in <#general>
															emoji:  {}			    // :emoji:								
														 };
		}

		/*
		 * Update user's message count 
		 */
		 userMsgStats.data[msgTextMetadataObj.user].message_count++;

		/*
		 *  Update mention statistics
		 */
		_.forEach(msgTextMetadataObj.mention, function (user) {

			// .. by user mentioning another user

			if(userMsgStats.data[msgTextMetadataObj.user].mention.hasOwnProperty(user)) {
				userMsgStats.data[msgTextMetadataObj.user].mention[user]++;
			}
			else {
				userMsgStats.data[msgTextMetadataObj.user].mention[user] = 1;	
			}

			// .. total	
			mentionStats.total++;

			// .. by mentioned user

			if(mentionStats.data.hasOwnProperty(user)) {
			   mentionStats.data[user]++;
			}
			else {
			   mentionStats.data[user] = 1;	
			}

		});

		/*
		 *  Update channel statistics (not that useful)
		 */
		_.forEach(msgTextMetadataObj.channel, function (channelName) {
			if(userMsgStats.data[msgTextMetadataObj.user].channel.hasOwnProperty(channelName)) {
			   userMsgStats.data[msgTextMetadataObj.user].channel[channelName]++;
			}
			else {
			   userMsgStats.data[msgTextMetadataObj.user].channel[channelName] = 1;	
			}
		});

		/*
		 *  Update channel link statistics 
		 */
		_.forEach(msgTextMetadataObj.channel_mention, function (channelLink) {

			// .. by user linking to a channel
			if(userMsgStats.data[msgTextMetadataObj.user].channel_mention.hasOwnProperty(channelLink)) {
				userMsgStats.data[msgTextMetadataObj.user].channel_mention[channelLink]++;
			}
			else {
				userMsgStats.data[msgTextMetadataObj.user].channel_mention[channelLink] = 1;	
			}

			// .. total	
			channelLinksStats.total++;

			// .. by linked channel
			if(channelLinksStats.data.hasOwnProperty(channelLink)) {
			   channelLinksStats.data[channelLink]++;
			}
			else {
			   channelLinksStats.data[channelLink] = 1;	
			}

		});

		/*
		 *  Update emoji statistics 
		 */
		_.forEach(msgTextMetadataObj.emoji, function (emojiName) {

			// .. by user using the emoji
			if(userMsgStats.data[msgTextMetadataObj.user].emoji.hasOwnProperty(emojiName)) {
			   userMsgStats.data[msgTextMetadataObj.user].emoji[emojiName]++;
			}
			else {
			   userMsgStats.data[msgTextMetadataObj.user].emoji[emojiName] = 1;	
			}

			// total	
			emojiStats.total++;

			// .. by used emoji
			if(emojiStats.data.hasOwnProperty(emojiName)) {
			   emojiStats.data[emojiName]++;
			}
			else {
			   emojiStats.data[emojiName] = 1;	
			}

		});

		/*
		 *  Update channel_link stats
		 */


		/*
		 *  Update emoji stats
		 */

	};						   

	/**
	 * @returns {string} identifies the channel for which the statistics were collected
	 */						   
	this.getChannelName = function() {
		return channelName;
	};

	/**
	 * @returns {Object} statistics - statistics about the slack channel. Note that if unclassified_message_count > 0
	 * it's time to update the slack message parser.
 	 * @returns {number} statistics.channel_message_count - number of messages in channel

	 */	
	this.getChannelStats = function() {
		return channelStats;
	};

	/**
	 * @returns {Object} userMsgStats - statistics for user generated messages
 	 * @returns {Object} userMsgStats.data
 	 * @returns {Number} userMsgStats.data.total
 	 * @returns {Object} userMsgStats.data.<userId>
 	 * @returns {Object} userMsgStats.data.<userId>.message_count
 	 * @returns {Object} userMsgStats.data.<userId>.mention
 	 * @returns {Object} userMsgStats.data.<userId>.mention.<userId2> value represents # of times <userId2> was mentioned by <userId>
 	 * @returns {Object} userMsgStats.data.<userId>.channel
 	 * @returns {Object} userMsgStats.data.<userId>.channel.<channelId> value represents # of times <channelId> was mentioned by <userId>
 	 * @returns {Object} userMsgStats.data.<userId>.channel_mention
 	 * @returns {Object} userMsgStats.data.<userId>.channel_mention.<channelId> value represents # of times <channelId> was mentioned by <userId>
 	 * @returns {Object} userMsgStats.data.<userId>.emoji
 	 * @returns {Object} userMsgStats.data.<userId>.emoji.<emojiId> value represents # of times <emojiId> was used by <userId>
	 */	
	this.getUserMsgStats = function() {
		return userMsgStats;
	};

	/**
	 * @returns {string} JSON representation of the channel statistics
	 */	
	this.toJSON = function() {

		var toArray = function(obj) {

			var arr = [];
			_.forEach(_.keys(obj).sort(), function (property) {
				arr.push({ [property]: obj[property]});
			});

			return arr;

		};

		var formattedUMS = {
								total: userMsgStats.total,
								data: []
							};				

		_.forEach(Object.keys(userMsgStats.data), function(ums) {
			formattedUMS.data.push({[ums]: {
											message_count: userMsgStats.data[ums].message_count,
											mention: toArray(userMsgStats.data[ums].mention),
										    channel_commands: toArray(userMsgStats.data[ums].channel), 
										    channel_mention: toArray(userMsgStats.data[ums].channel_mention), 
										    emoji: toArray(userMsgStats.data[ums].emoji)}}); 
		});

		return '{ "' + channelName + '":' +  
		         '{' +
				 '"user_msg_stats": ' + JSON.stringify(formattedUMS) + '},' + 
				 '"mention_stats": ' + JSON.stringify({total: mentionStats.total, data: toArray(mentionStats.data)}) + ',' +
				 '"channelLink_stats": ' + JSON.stringify({total: channelLinksStats.total, data: toArray(channelLinksStats.data)}) + ',' +
				 '"emoji_stats": ' + JSON.stringify({total: emojiStats.total, data: toArray(emojiStats.data)}) +
		       '}';
	};

	// -------------------------------------------------------------------------------------

};

module.exports = UserMsgStatistics;