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

const EventEmitter = require('events').EventEmitter,
	  fs = require('fs'),
	  path = require('path'),
	  async = require('async'),
	  _ = require('lodash');

const debug = require('debug')('slack_graph_setup:knowledge_graph'),
	  debug_alchemy = require('debug')('slack_graph_setup:alchemy');

// https://www.npmjs.com/package/watson-developer-cloud
const watson = require('watson-developer-cloud');

const slackMsgParser = require('./slackMsgParser.js');         // Slack message parser
const slackMsgTextParser = require('./slackMsgTextParser.js'); // Slack message text parser

/*
 * Utility class that extracts keywords from Slack message files using the Watson Alchemy keyword API.
 * @param alchemyApiKey {string} the API key that was assigned to Alchemy API instance that is bound to the calling application
 */
var KeywordExtractor = function (alchemyApiKey) {

	EventEmitter.call(this);

	const that = this;

	// initialize Alchemy API with key
	const al = watson.alchemy_language({
  								  		api_key: alchemyApiKey
		 					       	   });

	var fileCount = 0;

	/*
	 * Extracts keywords from Slack messages files for the specified channel and associates them with users and the channel.
	 * @param {string} channelName - Name of the Slack channel to be processed
	 * @param {string} dir - local directory where the SLack message files for channelName are stored
	 * @param {callback} callback - 
	 */
	var processChannel = function(channelName, dir, callback) {
		
		var channelMessages = {

								data: {},

								getRankedKeywords : function(limit) {

									var process_channel_this = this;

									const getKeywords = function() {

										var keywords = [];
										for (var user in process_channel_this.data) {
											keywords = _.unionBy(keywords, process_channel_this.data[user].keywords, 'text');
										}
										return keywords;
									};

	      							return _.slice(_.orderBy(getKeywords(), function(o) {
	      								return o.relevance;	
	      							},'desc'),0,limit);		   

								},

								toJSON : function() {
									return {[channelName]:{channel_keywords: this.getRankedKeywords(), user_data: this.data}};
								}

							  };
		var msg = null,
		    msgPlainText = null;

		/*
		   load Slack message files for <channelName> from <dir>, group messages by user and consolidate them into a single string
		   "Uxxxxxxx": {
    					"message_count": <number of messages>,
	    				"message_batches": ["<first 50kb of consolidated messages from user Uxxxxxxx in channelName>", <"second 50kb ...">]
	    			   }
    		
			Note: Watson Alchemy API only accepts text fragments up to 50kb in size. Therefore sets of messages are stored in chunks.

		 */

		fs.readdir(dir,
	              function(err, files) {

	    	var msgFile = null;       	
	    	console.log('Processing ' + files.length + ' message archive files from channel ' + channelName);

	    	fileCount = fileCount + files.length;

		    _.forEach(files, function(file) {

		    	// parse Slack message file
		    	msgFile = JSON.parse(fs.readFileSync(dir + file));

		    	// process each Slack record 
		   		_.forEach(msgFile, function(message) {

		   			// classify record
					msg = slackMsgParser.parseMsg(message);

					// process only Slack records associated with messages that were sent by users (not bots or issued by the system)
					if(msg && msg.isUserMsg()) {

						debug('Processing message text ' + msgPlainText + ' from channel ' + channelName + ' archive file ' + file);

						// extract and normalize message text (remove user and channel references, emoji's, convert to lower case and trim leading/trailing spaces)
						msgPlainText = slackMsgTextParser.parseMsgText(msg).plain_text.toLowerCase();

						if(msgPlainText.length > 0) {

							/* 
								group messages by user: message1 message2 ... messageN to optimize Alchemy processing 
							    "<userID>: { 
							   				message_count: 2, 
								    		message_batch: ['Hello World! I am doing fine, thank you.<up to 50k bytes>', '...'],
								    		keywords: []
							    		   }
							*/
							if(! channelMessages.data.hasOwnProperty(msg.getUser())) {
								// first message by this user; initialize the data structure
								channelMessages.data[msg.getUser()] = { 
																		message_count: 1,					// number of messages by this user in this channel
																		message_batches: [msgPlainText],	// chunks of messages (each chunk is up to 50kb in size)
																		keywords: []						// ranked keywords (extracted from message_batches)
														  			  };
							}
							else {
								// n-th message by this user
								channelMessages.data[msg.getUser()].message_count++;

								// determine if the last batch has enough room to hold the message text
								if((channelMessages.data[msg.getUser()].message_batches[channelMessages.data[msg.getUser()].message_batches.length - 1].length + msgPlainText.length + 1) < 51200) {
									channelMessages.data[msg.getUser()].message_batches[channelMessages.data[msg.getUser()].message_batches.length - 1] = channelMessages.data[msg.getUser()].message_batches[channelMessages.data[msg.getUser()].message_batches.length - 1] +
									                                                                                              ' ' + msgPlainText;

			   					}
			   					else {
			   						channelMessages.data[msg.getUser()].message_batches.push(msgPlainText);
			   					}
							}
						}

						msg = null;
					}
					else {
						if(msg) {
							// this message wasn't sent by a user; ignore
							debug('Skipping message of type ' + msg.getMsgType());	
						}
						else {
							// this indicates that the parser encountered an issue and couldn't classify the message.	
							console.error('Error. An unexpected Slack record was encountered in Slack message file ' + msgFile + ' Slack record: ' + JSON.stringify(message));
						}					
					}
					message = null;
				});
				msgFile = null;
		    });

	    	files = null;

	    	global.gc();

			/*
			 * For each user in the current channel extract keywords from messages that were sent by the user
			   "Uxxxxxxx": {
		    				"message_count": 123,
			    			"message_batches": ["<consolidated message text>"],
		    				"keywords": [
		      								{
		        								"relevance": "<score>",
		        								"text": "<keyword or phrase>"
		      								},
		      								...
		      							]
		      			   },
		       "Uxxxxxxy": {
		       				...
		       			   }	 
			*/
 
			async.eachOfLimit(channelMessages.data,	// above data structure
			              	  5,					// process messages for up to five users in parallel
			             	  function(userMessages, 
			             	  		   user, 
			             	  		   eachOfLimitCallback) {
			             				debug_alchemy('Extracting keywords from ' + user + '\'' + ' messages.');
				            			// invoke Watson Alchemy keyword API (http://www.ibm.com/watson/developercloud/alchemy-language/api/v1/#keywords) 
				            			// sequentially for each message batch for <user>
				            			async.eachSeries(userMessages.message_batches,
	            				            function (message_batch, eachSeriesCallback) {

								            	al.keywords({							
								            					text: message_batch,		// the text to be analyzed
								            	             	language: 'english'			// set language to avoid unsupported-text-language failures
								            	            }, 
														    function (err, response) {		// Alchemy API callback
														  		if (! err) {
													    			debug_alchemy(JSON.stringify(response, null, 2));
													    			// append keywords 
													    			// "keywords": [{"relevance": "<relevance>","text": "<keyword or phrase>"}, ...]
													    			userMessages.keywords = _.concat(userMessages.keywords, response.keywords);
													    			// processing for this message batch is complete; continue with next (if applicable)
													    			return eachSeriesCallback();
													    		}
													    		else {
													    			// a fatal or non-fatal error occurred while this message batch was processed; abort processing
													    			// return information about the user, analyzed messages and error to the caller
													    			return eachSeriesCallback({user:user, 
													    				                       cause:err,
													    				                       alchemy_payload_size: message_batch.length,
													    				                       analyzed_messages: message_batch});	
													    		}
												    			
															});
	            				            },
	            				            function (err) {  // eachSeries callback
	            				            	return eachOfLimitCallback(err);
	            				            });
								       },
								       function(err) {	// eachOfLimit callback

							    		  	if (err) {
							    		  		// Keyword extraction failed for at least one user in this channel
									    		console.error('Error extracting keywords from messages by user ' + err.user + ' in channel ' + channelName + ' : ', err);

									    		// if the error is likely going to cause failures when other channels are processed, 
									    		// notify the caller to abort
									    		if(err.cause.code && err.cause.code === 400) {
									    			// certain errors are fatal, e.g. error: 'daily-transaction-limit-exceeded', code: 400
									    			// indicate to the caller that further processing likely won't yield results								    			
									    			return callback(err.cause);
									    		}
									    		else {
										    		// probably a non fatal error that doesn't prevent keyword extraction to fail for other channels
										    		return callback(null); 
									    		}
									    	}
									  		else {
									  				// emit keyword statistics for this channel
									  				that.emit('channelStats', channelMessages);
							    					return callback(null); 	
									  		}
			            			   }); // async.eachOfLimit(channelMessages.data,	     	
	 	}); // fs.readdir(dir,
	}; // private function processChannel

	/*
	 *
	 */
	this.extract = function(messageArchiveDirectory,
							channelIdMap) {

		fs.readdir(messageArchiveDirectory,
	               function(err, files) {

	               	if(err) {
	               		that.emit('error', err);
	               	}
	               	else {
						// sequentially process files/directories in rootdir 
						async.eachSeries(files, 
										 function process(file, eachSeriesCallback) {

			       						 	// if "file" is a directory we assume it identifies a channel and contains one or more json message files
			       						 	fs.stat(path.join(messageArchiveDirectory, file, path.sep), function(err, stats) {
			       						 		if((stats) && (stats.isDirectory())) {
			       						 			// process files in this directory
			       						 			processChannel(channelIdMap[file] || file, path.join(messageArchiveDirectory, file, path.sep), eachSeriesCallback);	
			       						 		}
			       						 		else {
			       						 			console.log('Skipping file ' + file);
			       						 			return eachSeriesCallback();
			       						 		}
			       						 	});           						 	
									  	 }, 
										 function (err){
										  	if(err) {
										   		that.emit('error', err);
										   	}
										   	else {
										   		// keyword extraction is complete for all files in messageArchiveDirectory
										   		that.emit('done',{});
										   	}
										 }); // async.eachSeries
					}
	           });
	}; // end of method extract

}; // end of class KeywordExtractor

require('util').inherits(KeywordExtractor, EventEmitter);

// expose class 
module.exports = KeywordExtractor;