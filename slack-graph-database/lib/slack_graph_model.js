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

const _ = require('lodash');
const debug = require('debug')('slack_graph_model'),
	  debugModel = require('debug')('slack_graph_model:data');

/**
 * Simple representation of a Slack graph for a single team.
 *
 */
function SlackGraphModel (teamName) {

	this.slackTeamName = teamName || 'default';

	this.meta = {
					creationDate : new Date().toISOString()
				};
	
	this.graph = {
					vertices : {
									users: {},
									channels: {},
									keywords: {}
					}
				 };


	this.idCounters = {
						user: 0,				// user vertex counter
						channel: 0,				// channel vertex counter
						keyword: 0,				// keyword vertex counter
						mUser: 0,				// [user] mentions_user edge counter
						mChannel: 0,			// [user] mentions_channel edge counter
						mKeyword: 0,			// [user] mentions_keyword edge counter
						iiChannel: 0,			// [user] is_in_channel edge counter
						uiChannel: 0			// [keyword] used_in_channel edge counter
					  };

	// Slack user information lookup hash
	this.userInfoLookup = {};

	// Slack channel information lookup hash
	this.channelInfoLookup = {};

} // constructor

	// -----------------------------------------------------------------------------------
	// Model methods
	// -----------------------------------------------------------------------------------

	/**
	  * Returns the model name
	  */
	SlackGraphModel.prototype.getModelName = function() {
		return this.slackTeamName;
	};

	/**
	  * Returns the model's creation date
	  */
	SlackGraphModel.prototype.getcreationDate = function() {
		return this.meta.creationDate;
	};	

	/**
	  * If set, additional Slack user information is automatically added to user vertices during creation.
	  * @param {Object} lookup - hashmap containing additional user properties that can be added as user vertex properties
	  * @param {string} lookup[userId] - internal Slack user Id
	  * @param {string} lookup[userId].name - user name
	  */
	SlackGraphModel.prototype.setUserInfoLookup = function(lookup) {
		this.userInfoLookup = lookup || null;
	};	

	/**
	  * If set, additional Slack channel information is automatically added to channel vertices during creation.
	  * @param {Object} lookup - hashmap containing additional channel properties that can be added as channel vertex properties
	  * @param {string} lookup[channelId] - internal Slack channel Id
	  * @param {string} lookup[channelId].name - clear text channel name
	  */
	SlackGraphModel.prototype.setChannelInfoLookup = function(lookup) {
		this.channelInfoLookup = lookup || null;
	};	

	/**
	 * Add channel vertex to graph 
	 * @param {string} channelId - Internal Slack channel id (required)
     */
	 SlackGraphModel.prototype.addChannel = function(channelId) {

		// channel id is mandatory 
		if(! channelId) {
			return;
		}

		if(! this.graph.vertices.channels[channelId]) {

			this.idCounters.channel++;			

			this.graph.vertices.channels[channelId] = {
													    vertexId: null,					
														modelId: 'c' + this.idCounters.channel,
														outEdges: {}
												      };

			if(this.channelInfoLookup) {
				// add clear text slack channel name, if a mapping was defined
				if(this.channelInfoLookup[channelId]) {
					this.graph.vertices.channels[channelId].channelName = this.channelInfoLookup[channelId].name || ''; 	
				}
				else {
					this.graph.vertices.channels[channelId].channelName = '';
					debug('Warning. No lookup information is available for channel ' + channelId);
				}				
			}

			debugModel('Added channel vertex: ' + JSON.stringify(this.graph.vertices.channels[channelId]));			
		}
	}; // addChannel

	/**
	 * Add user vertex to graph 
	 * @param {string} userId - internal Slack user id (required)
     */
	SlackGraphModel.prototype.addUser = function(userId) {

		// user id is mandatory 
		if(! userId) {
			return;
		}

		if(! this.graph.vertices.users[userId]) {

			this.idCounters.user++;			

			this.graph.vertices.users[userId] = {
													vertexId: null,					
													modelId: 'u' + this.idCounters.user,
													outEdges: {}	
												};

			if(this.userInfoLookup) {
				// add clear text slack user name, if a mapping was defined
				if(this.userInfoLookup[userId]) {
					this.graph.vertices.users[userId].userName = this.userInfoLookup[userId].name || ''; 	
				}
				else {
					this.graph.vertices.users[userId].userName = '';
					debug('Warning. No lookup information is available for user ' + userId);
				}									
			}
			debugModel('Added user vertex ' + userId + ': ' + JSON.stringify(this.graph.vertices.users[userId]));

		}

	}; // addUser

	/**
	 * Add keyword vertex to graph 
	 * @param {string} keyword - important keyword that was used in messages (required)
     */
	SlackGraphModel.prototype.addKeyword = function(keyword) {

		keyword = (keyword || '').trim();

		// keyword is mandatory 
		if(keyword.length === 0) {
			return;
		}

		if(! this.graph.vertices.keywords[keyword]) {

			this.idCounters.keyword++;			

			this.graph.vertices.keywords[keyword] = {
														vertexId: null,					
														modelId: 'k' + this.idCounters.keyword,
														outEdges: {}	
													};

			debugModel('Added keyword vertex ' + keyword + ': ' + JSON.stringify(this.graph.vertices.keywords[keyword]));

		}

	}; // addKeyword

	/**
	 * Add is_in_channel edge to graph 
	 * @param {string} userId - slack user id
	 * @param {string} channelId - internal Slack channel id (required)
	 * @param {number} messageCount - count of messages attributed to userId in channelInfo.id
     */
	SlackGraphModel.prototype.addIsInChannel = function(userId, channelId, messageCount) {

		if((! userId) || (! channelId)) { 
			return; // vertices information is missing
		}

		// use default if a user never sent a message
		messageCount = messageCount || 0;

		this.idCounters.iiChannel++;

		// make sure a vertex for the user exists
		if(! this.graph.vertices.users[userId]) {
			this.addUser(userId);
		}

		// make sure a vertex for the channel exists
		if(! this.graph.vertices.channels[channelId]) {
			this.addChannel(channelId);
		}

		// make sure outgoing edges data structure is initialized
		if(! this.graph.vertices.users[userId].outEdges.is_in_channel) {
			this.graph.vertices.users[userId].outEdges.is_in_channel = [];	
		}

		this.graph.vertices.users[userId].outEdges.is_in_channel.push({
																		edgeId: null,
																		modelId: 'iic' + this.idCounters.iiChannel,
																		channelId: channelId,
																		messageCount: messageCount
															 	  	  });

		debugModel('Added is_in_channel edge: ' + JSON.stringify(this.graph.vertices.users[userId]));

	}; // addIsInChannel

	/**
	 * Add mentions_user edge to graph 
	 * @param {string} userId - slack user id (required)
	 * @param {string} mentionsUserId -  user id that was mentioned by userId (required)
	 * @param {number} mentionCount - number of times userId mentioned mentionsUserId in channel channelId (required)	
	 * @param {string} channelId - id of the slack channel in which userId mentioned mentionsUserId (required)
     */
	SlackGraphModel.prototype.addMentionsUsers = function(userId, mentionsUserId, mentionCount, channelId) {

		if((! userId) || (! mentionsUserId) || (! mentionCount) || (! channelId)) { 
			return; // required information is missing
		}

		this.idCounters.mUser++;

		// make sure a vertex for the user exists
		if(! this.graph.vertices.users[userId]) {
			this.addUser(userId);
		}

		// make sure a vertex for the mentioned user exists
		if(! this.graph.vertices.users[mentionsUserId]) {
			this.addUser(mentionsUserId);
		}

		// make sure a vertex for the referenced channel exists
		if(! this.graph.vertices.channels[channelId]) {
			this.addChannel(channelId);
		}

		// make sure outgoing edges data structure is initialized
		if(! this.graph.vertices.users[userId].outEdges.mentions_user) {
			this.graph.vertices.users[userId].outEdges.mentions_user = [];	
		}

		var edge = {
					edgeId: null,
					modelId: 'mu' + this.idCounters.mUser,
					userId: mentionsUserId,
					mentionCount: mentionCount,
					inChannelId: channelId
				   };
		   
				// add slack channel name property, if a mapping was defined		   
		if(this.channelInfoLookup) {
			// add clear text slack channel name, if a mapping was defined
			if(this.channelInfoLookup[channelId]) {
				edge.inChannelName = this.channelInfoLookup[channelId].name || ''; 	
			}
			else {
				edge.inChannelName = '';
			}				
		}	

		this.graph.vertices.users[userId].outEdges.mentions_user.push(edge);

		debugModel('Added mentions_user edge: ' + JSON.stringify(this.graph.vertices.users[userId]));

	}; // addMentionsUsers

	/**
	 * Add mentions_channel edge to graph 
	 * @param {string} userId - slack user id
	 * @param {Object} mentionsChannelId - internal Slack channel id (required)
	 * @param {number} mentionCount - number of times userId mentioned mentionsChannelId in channel channelId	
	 * @param {string} channelId - id of the slack channel in which userId mentioned mentionsChannelId
     */
	SlackGraphModel.prototype.addMentionsChannel = function(userId, mentionsChannelId, mentionCount, channelId) {

		if((! userId) || (! mentionsChannelId) || (! mentionCount) || (! channelId)) { 
			return; // required information is missing
		}

		this.idCounters.mChannel++;

		// make sure a vertex for the user exists
		if(! this.graph.vertices.users[userId]) {
			this.addUser(userId);
		}

		// make sure a vertex for the mentioned channel exists
		if(! this.graph.vertices.channels[mentionsChannelId]) {
			this.addChannel(mentionsChannelId);
		}

		// make sure a vertex for the channel exists
		if(! this.graph.vertices.channels[channelId]) {
			this.addChannel(channelId);
		}

		if(! this.graph.vertices.users[userId].outEdges.mentions_channel) {
			this.graph.vertices.users[userId].outEdges.mentions_channel = [];	
		}
		
		var edge = {
					  edgeId: null,
					  modelId: 'mc' + this.idCounters.mChannel,																		  			
					  channelId: mentionsChannelId,
					  mentionCount: mentionCount,
					  inChannelId: channelId
				   };

		// add slack channel name property, if a mapping was defined		   
		if(this.channelInfoLookup) {
			// add clear text slack channel name, if a mapping was defined
			if(this.channelInfoLookup[channelId]) {
				edge.inChannelName = this.channelInfoLookup[channelId].name || ''; 	
			}
			else {
				edge.inChannelName = '';
			}				
		}

		this.graph.vertices.users[userId].outEdges.mentions_channel.push(edge);

		debugModel('Added mentions_channel edge: ' + JSON.stringify(this.graph.vertices.users[userId]));

	}; // addMentionsChannel


	/**
	 * Add [user] mentions_keyword edge to graph 
	 * @param {string} userId - slack user id
	 * @param {Object} keyword - keyword (required)
     */
	SlackGraphModel.prototype.addMentionsKeyword = function(userId, keyword) {

		keyword = (keyword || '').trim();

		if((! userId) || (keyword.length === 0)) { 
			return; // required information is missing
		}

		// make sure a vertex for the user exists
		if(! this.graph.vertices.users[userId]) {
			this.addUser(userId);
		}

		// make sure a vertex for the mentioned keyword exists
		if(! this.graph.vertices.keywords[keyword]) {
			this.addKeyword(keyword);
		}

		if(! this.graph.vertices.users[userId].outEdges.mentions_keyword) {
			this.graph.vertices.users[userId].outEdges.mentions_keyword = [];	
		}

		// add edge if it doesn't exist already
		if(! _.find(this.graph.vertices.users[userId].outEdges.mentions_keyword, function(edge) {return (edge.keywordId === keyword); })) {

			this.idCounters.mKeyword++;

			var edge = {
						  edgeId: null,
						  modelId: 'mk' + this.idCounters.mKeyword,																		  			
						  keywordId: keyword
					   };

			this.graph.vertices.users[userId].outEdges.mentions_keyword.push(edge);

			debugModel('Added mentions_keyword edge: ' + JSON.stringify(this.graph.vertices.users[userId]));

		}		

	}; // addMentionsKeyword

	/**
	 * Add [keyword] used_in_channel edge to graph; connects keyword vertex with channel vertex
	 * @param {Object} keyword - keyword (required)
	 * @param {string} channelId - Slack channel id (required)
     */
	SlackGraphModel.prototype.addUsedInChannel = function(keyword, channelId) {

		keyword = (keyword || '').trim();

		if((! channelId) || (keyword.length === 0)) { 
			return; // required information is missing
		}

		// make sure a vertex for the channel exists
		if(! this.graph.vertices.channels[channelId]) {
			this.addChannel(channelId);
		}

		// make sure a vertex for the mentioned keyword exists
		if(! this.graph.vertices.keywords[keyword]) {
			this.addKeyword(keyword);
		}

		if(! this.graph.vertices.keywords[keyword].outEdges.used_in_channel) {
			this.graph.vertices.keywords[keyword].outEdges.used_in_channel = [];	
		}

		// add edge between keyword and channel vertices if it doesn't exist already
		if(! _.find(this.graph.vertices.keywords[keyword].outEdges.used_in_channel, function(edge) {return (edge.channelId === channelId); })) {

			this.idCounters.uiChannel++;

			var edge = {
						  edgeId: null,
						  modelId: 'uic' + this.idCounters.uiChannel,																		  			
						  channelId: channelId
					   };

			this.graph.vertices.keywords[keyword].outEdges.used_in_channel.push(edge);

			debugModel('Added used_in_channel edge: ' + JSON.stringify(this.graph.vertices.keywords[keyword]));

		}		

	}; // addUsedInChannel

	/**
	  * Returns vertices and edges statistics for this graph model.
	  * @returns 
	  */
	SlackGraphModel.prototype.getModelStatistics = function () {

		return  {
					'user_vertexes' : this.idCounters.user,
					'channel_vertexes' : this.idCounters.channel,
					'keyword_vertexes' : this.idCounters.keyword,
					'is_in_channel_edges' : this.idCounters.iiChannel,
					'mentions_user_edges' : this.idCounters.mUser,
					'mentions_channel_edges' : this.idCounters.mChannel,
					'mentions_keyword_edges' : this.idCounters.mKeyword,
					'used_in_channel' : this.idCounters.uiChannel
				};

	}; // getModelStatistics

	/**
	 * 
	 * @param 
	 * @returns {Object} gremlinBatches []
	 * @returns {string} gremlinBatches.mId - vertex model id
	 * @returns {string} gremlinBatches.ddl - vertex gremlin script
	 * @returns {string} gremlinBatches.bindings [] - vertex gremlin variable bindings for gremlinBatches.ddl
	 */
	SlackGraphModel.prototype.generateGremlinDDLBatches = function() {

		/*
		 * Helper function initializes a new gremlin batch object.
		 * param {number} stage - identifies the graph build stage in which the batch must be executed. Valid values      
         *                        are 1 (vertices) and 2 (edges). Default is 2.
		 */
		var newGremlinBatch = function(stage) {

			if ((! stage) || ((stage !== 1) && (stage !== 2))) {
				stage = 2;
			}

			return {
						size: 0,			              // batch size
						graphBuildStage: stage,           // defines the order in which batches must be processed (1 = vertices, must always be processed first; 2 = edges)
						mIds: [],
						ddl: '',			              // gremlin graph traversal/manipulation string
						ddlBindings: {}	                  // variable bindings for ddl
				   };
		};

		var gremlinBatches = []; // return data structure
		var gremlinBatch = null;
		const maxBatchSize = 56*1024; //60*1024;

		// generate gremlin artifacts for channel vertices
		if(Object.keys(this.graph.vertices.channels).length > 0) {

			debug('Generating gremlin scripts for ' + Object.keys(this.graph.vertices.channels).length + ' channel vertices.');

			// create new batch; build stage 1
			gremlinBatch = newGremlinBatch(1);
			_.forEach(Object.keys(this.graph.vertices.channels), 
				      function (channelId) {

				      	 if(this.graph.vertices.channels[channelId].hasOwnProperty('channelName')) {
				      	 	gremlinBatch.ddl = gremlinBatch.ddl + 'def ' + this.graph.vertices.channels[channelId].modelId + '=graph.addVertex(T.label,"channel","channelId",v_' + this.graph.vertices.channels[channelId].modelId + '_id,"channelName",v_' + this.graph.vertices.channels[channelId].modelId + '_name,"isChannel",true).id(); l<<' + this.graph.vertices.channels[channelId].modelId + ';';
							gremlinBatch.ddlBindings['v_' + this.graph.vertices.channels[channelId].modelId + '_id'] = channelId;
							gremlinBatch.ddlBindings['v_' + this.graph.vertices.channels[channelId].modelId + '_name'] = this.graph.vertices.channels[channelId].channelName;
				      	 }
				      	 else {
						    gremlinBatch.ddl = gremlinBatch.ddl + 'def ' + this.graph.vertices.channels[channelId].modelId + '=graph.addVertex(T.label,"channel","channelId",v_' + this.graph.vertices.channels[channelId].modelId + '_id,"isChannel",true).id(); l<<' + this.graph.vertices.channels[channelId].modelId + ';';
							gremlinBatch.ddlBindings['v_' + this.graph.vertices.channels[channelId].modelId + '_id'] = channelId;
						}

						gremlinBatch.mIds.push(this.graph.vertices.channels[channelId].modelId);

						gremlinBatch.size = gremlinBatch.ddl.length + JSON.stringify(gremlinBatch.ddlBindings).length;

						if(gremlinBatch.size >= maxBatchSize) {
							gremlinBatch.ddl='def l=[];' + gremlinBatch.ddl + 'l;';
							gremlinBatch.size = gremlinBatch.size + 13;
		 					gremlinBatches.push(gremlinBatch);
		 					gremlinBatch = newGremlinBatch(1);	
						}
					     
					  }.bind(this));

			if(gremlinBatch.size > 0) {
				gremlinBatch.ddl = 'def l=[];' + gremlinBatch.ddl + 'l;';
				gremlinBatch.size = gremlinBatch.size + 13;
				gremlinBatches.push(gremlinBatch);	
			}

			gremlinBatch = null;

			debug('Done generating gremlin scripts for channel vertices.');

		}

		// generate gremlin artifacts for user vertices
		if(Object.keys(this.graph.vertices.users).length > 0) {

			debug('Generating  ' + Object.keys(this.graph.vertices.users).length + ' for user vertices.');

			// create new batch; build stage 1
			gremlinBatch = newGremlinBatch(1);

			// generate gremlin artifacts for user vertices
			_.forEach(Object.keys(this.graph.vertices.users), 
				      function (userId) {

				      	if(this.graph.vertices.users[userId].hasOwnProperty('userName')) {
						    gremlinBatch.ddl = gremlinBatch.ddl + 'def ' + this.graph.vertices.users[userId].modelId + ' = graph.addVertex(T.label,"user","userId",v_' + this.graph.vertices.users[userId].modelId + '_id,"userName",v_' + this.graph.vertices.users[userId].modelId + '_name,"isUser",true).id(); l<<' + this.graph.vertices.users[userId].modelId + ';';
							gremlinBatch.ddlBindings['v_' + this.graph.vertices.users[userId].modelId + '_id'] = userId;
							gremlinBatch.ddlBindings['v_' + this.graph.vertices.users[userId].modelId + '_name'] = this.graph.vertices.users[userId].userName;
				      	}
				      	else {
							gremlinBatch.ddl = gremlinBatch.ddl + 'def ' + this.graph.vertices.users[userId].modelId + ' = graph.addVertex(T.label,"user","userId",v_' + this.graph.vertices.users[userId].modelId + '_id,"isUser",true).id(); l<<' + this.graph.vertices.users[userId].modelId + ';';
							gremlinBatch.ddlBindings['v_' + this.graph.vertices.users[userId].modelId + '_id'] = userId;												 	    
				      	}

						gremlinBatch.mIds.push(this.graph.vertices.users[userId].modelId);

						gremlinBatch.size = gremlinBatch.ddl.length + JSON.stringify(gremlinBatch.ddlBindings).length;

						if(gremlinBatch.size >= maxBatchSize) {
							gremlinBatch.ddl = 'def l=[];' + gremlinBatch.ddl + 'l;';
							gremlinBatch.size = gremlinBatch.size + 13;						
		 					gremlinBatches.push(gremlinBatch);
		 					gremlinBatch = newGremlinBatch(1);	
						}		      	 	
					     
					  }.bind(this));


			if(gremlinBatch.size > 0) {
				gremlinBatch.ddl = 'def l=[];' + gremlinBatch.ddl + 'l;';
				gremlinBatch.size = gremlinBatch.size + 13;
				gremlinBatches.push(gremlinBatch);	
			}

			gremlinBatch = null;			

			debug('Done generating gremlin scripts for user vertices.');

		}

		// generate gremlin artifacts for keyword vertices 
		if(Object.keys(this.graph.vertices.keywords).length > 0) {

			debug('Generating  ' + Object.keys(this.graph.vertices.keywords).length + ' for keyword vertices.');

			// create new batch; build stage 1
			gremlinBatch = newGremlinBatch(1);

			// generate gremlin artifacts for keyword vertices
			_.forEach(Object.keys(this.graph.vertices.keywords), 
				      function (keyword) {

						gremlinBatch.ddl = gremlinBatch.ddl + 'def ' + this.graph.vertices.keywords[keyword].modelId + ' = graph.addVertex(T.label,"keyword","keyword",v_' + this.graph.vertices.keywords[keyword].modelId + '_id,"isKeyword",true).id(); l<<' + this.graph.vertices.keywords[keyword].modelId + ';';
						gremlinBatch.ddlBindings['v_' + this.graph.vertices.keywords[keyword].modelId + '_id'] = keyword;												 	    

						gremlinBatch.mIds.push(this.graph.vertices.keywords[keyword].modelId);

						gremlinBatch.size = gremlinBatch.ddl.length + JSON.stringify(gremlinBatch.ddlBindings).length;

						if(gremlinBatch.size >= maxBatchSize) {
							gremlinBatch.ddl = 'def l=[];' + gremlinBatch.ddl + 'l;';
							gremlinBatch.size = gremlinBatch.size + 13;						
		 					gremlinBatches.push(gremlinBatch);
		 					gremlinBatch = newGremlinBatch(1);	
						}		      	 	
					     
					  }.bind(this));


			if(gremlinBatch.size > 0) {
				gremlinBatch.ddl = 'def l=[];' + gremlinBatch.ddl + 'l;';
				gremlinBatch.size = gremlinBatch.size + 13;
				gremlinBatches.push(gremlinBatch);	
			}

			gremlinBatch = null;	

			debug('Done generating gremlin scripts for keyword vertices.');		

		}

		debug('Generating gremlin scripts for edges associated with user vertices.');

		// generate gremlin artifacts for edges originating from user vertices
		var vertexReferences = {};
		gremlinBatch = newGremlinBatch(2);

		/*
		 * Helper
		 */
		var addUserDef = function (userId, gremlinBatch) {

	      	// fetch vertex id for userId
	      	// gremlin: def uXX = g.V().hasLabel("user").has("userId", v_uXX_id).next();
	      	// bindings: v_uXX_id : userId (e.g. U0ABCDEF)
			gremlinBatch.ddl = gremlinBatch.ddl + 
							   'def ' + 
			                   this.graph.vertices.users[userId].modelId + 
			                   '=g.V().has("userId", v_' + this.graph.vertices.users[userId].modelId + '_id).next(); ';
			gremlinBatch.ddlBindings['v_' + this.graph.vertices.users[userId].modelId + '_id'] = userId;

			// add userId to this batch's lookup
			vertexReferences[userId] = this.graph.vertices.users[userId].modelId;

			return 	gremlinBatch; 
		}.bind(this);

		/*
		  export metadata for edges originating from user vertices
		  gremlin def uX = g.V().has("userId","uid").next(); uX.addEdge("is_in_channel", g.V().has("channelId","cid").next());
		 */

		_.forEach(Object.keys(this.graph.vertices.users), 
			      function (userId) {
									                    
					gremlinBatch = addUserDef(userId, gremlinBatch);

			      	// add gremlin for is_in_channel edges
			      	// gremlin: uXX.addEdge("is_in_channel", g.V().has("channelId", v_iicYY_cid).next(), "messageCount", v_iicYY_mc);
			      	// bindings: v_iicYY_cid : channelId (e.g. C01234567)			      	
			      	//           v_iicYY_mc : messageCount (e.g. 23)
			      	if(this.graph.vertices.users[userId].outEdges.hasOwnProperty('is_in_channel')) {
			      		_.forEach(this.graph.vertices.users[userId].outEdges.is_in_channel, 
			      			      function(iicEdge) {
									gremlinBatch.ddl = gremlinBatch.ddl + 
									                   this.graph.vertices.users[userId].modelId + 
									                   '.addEdge("is_in_channel",g.V().has("channelId", v_' + iicEdge.modelId + '_cid).next(),"messageCount",v_' + iicEdge.modelId + '_mc);'; 
									gremlinBatch.ddlBindings['v_' + iicEdge.modelId + '_cid'] = iicEdge.channelId;	
									gremlinBatch.ddlBindings['v_' + iicEdge.modelId + '_mc'] = iicEdge.messageCount;										                   	

								    gremlinBatch.size = gremlinBatch.ddl.length + JSON.stringify(gremlinBatch.ddlBindings).length;

									if(gremlinBatch.size >= maxBatchSize) {
										gremlinBatch.ddl = 'def g=graph.traversal();' + gremlinBatch.ddl;
										gremlinBatch.size = gremlinBatch.size + 26;
										gremlinBatches.push(gremlinBatch);
										vertexReferences = {};											
					 					gremlinBatch = addUserDef(userId, newGremlinBatch(2));	
									}

			      			      }.bind(this));											 	    
			      	}

			      	// add gremlin for mentions_channel edges
			      	// gremlin: uXX.addEdge("mentions_channel", g.V().has("channelId", v_mcYY_cid).next(), "mentionCount", v_mcYY_mc, "inChannelId", v_mcYY_icid);
			      	// bindings: v_mcYY_cid  : channelId (e.g. C01234567)			      	
			      	//           v_mcYY_icid : inChannelId (e.g. C31234568)
			      	//           v_mcYY_mc   : mentionCount (e.g. 45)
			      	if(this.graph.vertices.users[userId].outEdges.hasOwnProperty('mentions_channel')) {
			      		_.forEach(this.graph.vertices.users[userId].outEdges.mentions_channel, 
			      			      function(mcEdge) {
									gremlinBatch.ddl = gremlinBatch.ddl + 
									                   this.graph.vertices.users[userId].modelId + 
									                   '.addEdge("mentions_channel",g.V().has("channelId",v_' + mcEdge.modelId + '_cid).next(),"mentionCount",v_' + mcEdge.modelId + '_mc,"inChannelId",v_' + mcEdge.modelId + '_icid';
									// add inChannelName property, if defined                    	
									if(mcEdge.hasOwnProperty('inChannelName')) {
										gremlinBatch.ddl = gremlinBatch.ddl + ',"inChannelName",v_' + mcEdge.modelId + '_icn';
										gremlinBatch.ddlBindings['v_' + mcEdge.modelId + '_icn'] = mcEdge.inChannelName;											
									}										                    

									gremlinBatch.ddl = gremlinBatch.ddl + ');'; 
									                   
									gremlinBatch.ddlBindings['v_' + mcEdge.modelId + '_cid'] = mcEdge.channelId;	
									gremlinBatch.ddlBindings['v_' + mcEdge.modelId + '_icid'] = mcEdge.inChannelId;									                   	
									gremlinBatch.ddlBindings['v_' + mcEdge.modelId + '_mc'] = mcEdge.mentionCount;										                   	

								    gremlinBatch.size = gremlinBatch.ddl.length + JSON.stringify(gremlinBatch.ddlBindings).length;

									if(gremlinBatch.size >= maxBatchSize) {
										gremlinBatch.ddl = 'def g=graph.traversal();' + gremlinBatch.ddl;
										gremlinBatch.size = gremlinBatch.size + 26;
										gremlinBatches.push(gremlinBatch);
										vertexReferences = {};
					 					gremlinBatch = addUserDef(userId, newGremlinBatch(2));	
									}

			      			      }.bind(this));											 	    
			      	}

					// add gremlin for mentions_user edges
			      	// gremlin: uXX.addEdge("mentions_user", g.V().has("userId", v_muYY_id).next(), "mentionCount", v_muYY_mc, "inChannelId", v_muYY_icid);
			      	// bindings: v_muYY_cid  : userId (e.g. U01234567)			      	
			      	//           v_muYY_icid : inChannelId (e.g. C31234568)
			      	//           v_muYY_mc   : mentionCount (e.g. 45)
			      	if(this.graph.vertices.users[userId].outEdges.hasOwnProperty('mentions_user')) {
			      		_.forEach(this.graph.vertices.users[userId].outEdges.mentions_user, 
			      			      function(muEdge) {

			      			      	if(vertexReferences[muEdge.userId]) {
										gremlinBatch.ddl = gremlinBatch.ddl + 
										                   this.graph.vertices.users[userId].modelId + 
										                   '.addEdge("mentions_user",' + vertexReferences[muEdge.userId] + ',"mentionCount",v_' + muEdge.modelId + '_mc,"inChannelId",v_' + muEdge.modelId + '_icid'; 
										gremlinBatch.ddlBindings['v_' + muEdge.modelId + '_icid'] = muEdge.inChannelId;										                   	
										gremlinBatch.ddlBindings['v_' + muEdge.modelId + '_mc'] = muEdge.mentionCount;	
			      			      	}
			      			      	else {
										gremlinBatch.ddl = gremlinBatch.ddl + 
										                   this.graph.vertices.users[userId].modelId + 
										                   '.addEdge("mentions_user", g.V().has("userId",v_' + muEdge.modelId + '_id).next(),"mentionCount",v_' + muEdge.modelId + '_mc,"inChannelId",v_' + muEdge.modelId + '_icid'; 
										gremlinBatch.ddlBindings['v_' + muEdge.modelId + '_id'] = muEdge.userId;	
										gremlinBatch.ddlBindings['v_' + muEdge.modelId + '_icid'] = muEdge.inChannelId;										                   	
										gremlinBatch.ddlBindings['v_' + muEdge.modelId + '_mc'] = muEdge.mentionCount;										                   	
			      			      	}

									// add inChannelName property, if defined                    	
									if(muEdge.hasOwnProperty('inChannelName')) {
										gremlinBatch.ddl = gremlinBatch.ddl + ',"inChannelName",v_' + muEdge.modelId + '_icn';
										gremlinBatch.ddlBindings['v_' + muEdge.modelId + '_icn'] = muEdge.inChannelName;											
									}										                    

									gremlinBatch.ddl = gremlinBatch.ddl + ');'; 

								    gremlinBatch.size = gremlinBatch.ddl.length + JSON.stringify(gremlinBatch.ddlBindings).length;
									if(gremlinBatch.size >= maxBatchSize) {
										gremlinBatch.ddl = 'def g=graph.traversal();' + gremlinBatch.ddl;
										gremlinBatch.size = gremlinBatch.size + 26;
										gremlinBatches.push(gremlinBatch);
										vertexReferences = {};
					 					gremlinBatch = addUserDef(userId, newGremlinBatch(2));	
									}

			      			      }.bind(this));											 	    
			      	}		      	 	
				     

			      	// add gremlin for mentions_keyword edges 
			      	// gremlin: uXX.addEdge("mentions_keyword", g.V().has("keyword", v_mkYY_kw).next());
			      	// bindings: v_mkYY_kw  : keyword (e.g. dashDB)
			      	if(this.graph.vertices.users[userId].outEdges.hasOwnProperty('mentions_keyword')) {
			      		_.forEach(this.graph.vertices.users[userId].outEdges.mentions_keyword, 
			      			      function(mkEdge) {
									gremlinBatch.ddl = gremlinBatch.ddl + 
									                   this.graph.vertices.users[userId].modelId + 
									                   '.addEdge("mentions_keyword",g.V().has("keyword",v_' + mkEdge.modelId + '_kw).next()';									                    

									gremlinBatch.ddl = gremlinBatch.ddl + ');'; 
									                   
									gremlinBatch.ddlBindings['v_' + mkEdge.modelId + '_kw'] = mkEdge.keywordId;	

								    gremlinBatch.size = gremlinBatch.ddl.length + JSON.stringify(gremlinBatch.ddlBindings).length;

									if(gremlinBatch.size >= maxBatchSize) {
										gremlinBatch.ddl = 'def g=graph.traversal();' + gremlinBatch.ddl;
										gremlinBatch.size = gremlinBatch.size + 26;
										gremlinBatches.push(gremlinBatch);
										vertexReferences = {};
					 					gremlinBatch = addUserDef(userId, newGremlinBatch(2));	
									}

			      			      }.bind(this));											 	    
			      	}

				  }.bind(this)); // add edges to user vertex

		if(gremlinBatch.size > 0) {					
			gremlinBatch.ddl = 'def g=graph.traversal();' + gremlinBatch.ddl;
			gremlinBatch.size = gremlinBatch.size + 26;
			gremlinBatches.push(gremlinBatch);
		}

		debug('Done generating gremlin scripts for edges associated with user vertices.');

		debug('Generating gremlin scripts for edges associated with keyword vertices.');

		vertexReferences = {};
		gremlinBatch = newGremlinBatch(2);

		/*
		 * Graph traversal helper; looks up keyword id in graph that will be referenced in later graph traversals
		 */
		var addKeywordDef = function (keyword, gremlinBatch) {
	      	// fetch vertex id for keyword
	      	// gremlin: def kXX = g.V().hasLabel("keyword").has("keyword", v_kXX_kw).next();
	      	// bindings: v_kXX_id : keyword (e.g. Cloudant)
			gremlinBatch.ddl = gremlinBatch.ddl + 
							   'def ' + 
			                   this.graph.vertices.keywords[keyword].modelId + 
			                   '=g.V().hasLabel("keyword").has("keyword", v_' + this.graph.vertices.keywords[keyword].modelId + '_kw).next(); ';
			gremlinBatch.ddlBindings['v_' + this.graph.vertices.keywords[keyword].modelId + '_kw'] = keyword;

			// add userId to this batch's lookup
			vertexReferences[keyword] = this.graph.vertices.keywords[keyword].modelId;

			return 	gremlinBatch; 
		}.bind(this);

		/*
		  create gremlin for [keyword] used_in_channel edge
		  gremlin def kX = g.V().hasLabel("keyword").has("keyword","v_uicYY_kw").next(); kX.addEdge("used_in_channel", g.V().has("channelId","cid").next());
		 */

		_.forEach(Object.keys(this.graph.vertices.keywords), 
			      function (keyword) {

				    gremlinBatch = addKeywordDef(keyword, gremlinBatch);	

				    _.forEach(this.graph.vertices.keywords[keyword].outEdges.used_in_channel, 
				      		  function(uicEdge) {
				      			    /*
										{
											edgeId: null,
											modelId: 'uic' + <counter>,																		  			
											channelId: channelId
									    }
									*/  	

									gremlinBatch.ddl = gremlinBatch.ddl + 
									                   this.graph.vertices.keywords[keyword].modelId + 
									                   '.addEdge("used_in_channel",g.V().has("channelId", v_' + uicEdge.modelId + '_cid).next());'; 
									gremlinBatch.ddlBindings['v_' + uicEdge.modelId + '_cid'] = uicEdge.channelId;										                   	

								    gremlinBatch.size = gremlinBatch.ddl.length + JSON.stringify(gremlinBatch.ddlBindings).length;

									if(gremlinBatch.size >= maxBatchSize) {
										gremlinBatch.ddl = 'def g=graph.traversal();' + gremlinBatch.ddl;
										gremlinBatch.size = gremlinBatch.size + 26;
										gremlinBatches.push(gremlinBatch);
										vertexReferences = {};											
					 					gremlinBatch = addKeywordDef(keyword, newGremlinBatch(2));	
									}
			      			    }.bind(this));
				  }.bind(this));

			if(gremlinBatch.size > 0) {					
				gremlinBatch.ddl = 'def g=graph.traversal();' + gremlinBatch.ddl;
				gremlinBatch.size = gremlinBatch.size + 26;
		 		gremlinBatches.push(gremlinBatch);
			}

			debug('Done generating gremlin scripts for edges associated with keyword vertices.');

			/*
			 *  Cleanup
			 */

			var gremlinBatchSizeHWM = 0;
			var count = 0, counter = 1;
			_.forEach(gremlinBatches, function(gremlinBatch) {
				debug('Appoximate gremlin size for batch ' + counter + ' : ' + gremlinBatch.size);
				if(gremlinBatch.size > gremlinBatchSizeHWM) {
					gremlinBatchSizeHWM = gremlinBatch.size;
				}
				if(gremlinBatch.size > maxBatchSize) {
					count++;
				}
				counter++;
			});

			if(gremlinBatchSizeHWM > 64512) {
				// max is 64k (64512 = 63 * 1024)
				console.error('Gremlin batch size warning limit ' + maxBatchSize + ' was exceeded ' + count + ' time(s) . High warter mark: ' + gremlinBatchSizeHWM);
			}

		// returns [{size, graphBuildStage, mIds, ddl, ddlBindings}, ...]
		return gremlinBatches;

	}; // generateGremlinDDLBatches


	/**
	 * Returns the in-memory graph model as JSON
	 * @returns {string} JSON 
	 */
	SlackGraphModel.prototype.exportGraphToJSON = function() {

		return JSON.stringify({
								'slack-team-name': this.getModelName(), 
								'model-info': {
												'created': this.getcreationDate(),
												'uuid-counters': this.idCounters
											  },
								'graph-definition':  this.graph
							  });

	}; // exportToJSON

	/**
	 * 
	 * @returns {Object} gremlinArtifacts []
	 * @returns {string} gremlinArtifacts.mId - vertex model id
	 * @returns {string} gremlinArtifacts.ddl - vertex gremlin script
	 * @returns {string} gremlinArtifacts.bindings [] - vertex gremlin variable bindings for gremlinArtifacts.ddl
	 */
	 /*
	SlackGraphModel.prototype.exportGremlinArtifacts = function() {

		var gremlinArtifacts = [];
		var ddl = null;
		var ddlBindings = null;

		// generate gremlin artifacts for channel vertices
		_.forEach(Object.keys(this.graph.vertices.channels), 
			      function (channelId) {

			      	ddlBindings = {};

			      	 if(this.graph.vertices.channels[channelId].channelName) {

			      	 	ddl = 'def  ' + this.graph.vertices.channels[channelId].modelId + ' = graph.addVertex(T.label, "channel", "channelId", v_' + this.graph.vertices.channels[channelId].modelId + '_id, "channelName", v_' + this.graph.vertices.channels[channelId].modelId + '_name, \"isChannel\", true).id(); l << ' + this.graph.vertices.channels[channelId].modelId + ';';
						ddlBindings['v_' + this.graph.vertices.channels[channelId].modelId + '_id'] = channelId;
						ddlBindings['v_' + this.graph.vertices.channels[channelId].modelId + '_name'] = this.graph.vertices.channels[channelId].channelName;
			      	 }
			      	 else {
					    ddl = 'def  ' + this.graph.vertices.channels[channelId].modelId + ' = graph.addVertex(T.label, "channel", "channelId", v_' + this.graph.vertices.channels[channelId].modelId + '_id, \"isChannel\", true).id(); l << ' + this.graph.vertices.channels[channelId].modelId + ';';
						ddlBindings['v_' + this.graph.vertices.channels[channelId].modelId + '_id'] = channelId;
					}

 					gremlinArtifacts.push({ 
											mId: this.graph.vertices.channels[channelId].modelId,
											ddl: ddl,
											bindings: ddlBindings
				    });			      	 	

				     
				  }.bind(this));

		ddl = null;
		ddlBindings = null;

		// generate gremlin artifacts for user vertices
		_.forEach(Object.keys(this.graph.vertices.users), 
			      function (userId) {

			      	ddlBindings = {};

			      	if(this.graph.vertices.users[userId].userName) {
					    ddl = 'def  ' + this.graph.vertices.users[userId].modelId + ' = graph.addVertex(T.label, "user", "userId", v_' + this.graph.vertices.users[userId].modelId + '_id, "userName", v_' + this.graph.vertices.users[userId].modelId + '_name,\"isUser\", true).id(); l << ' + this.graph.vertices.users[userId].modelId + ';';
						ddlBindings['v_' + this.graph.vertices.users[userId].modelId + '_id'] = userId;
						ddlBindings['v_' + this.graph.vertices.users[userId].modelId + '_name'] = this.graph.vertices.users[userId].userName;
			      	}
			      	else {
						ddl = 'def  ' + this.graph.vertices.users[userId].modelId + ' = graph.addVertex(T.label, "user", "userId", v_' + this.graph.vertices.users[userId].modelId + '_id,\"isUser\", true).id(); l << ' + this.graph.vertices.users[userId].modelId + ';';
						ddlBindings['v_' + this.graph.vertices.users[userId].modelId + '_id'] = userId;												 	    
			      	}

					gremlinArtifacts.push({ 
											mId: this.graph.vertices.users[userId].modelId,
											ddl: ddl,
											bindings: ddlBindings
										  });			      	 	
				     
				  }.bind(this));


		ddl = null;
		ddlBindings = null;

		// generate gremlin artifacts for keyword vertices
		_.forEach(Object.keys(this.graph.vertices.keywords), 
			      function (keyword) {

			      	ddlBindings = {};

					ddl = 'def  ' + this.graph.vertices.keywords[keyword].modelId + ' = graph.addVertex(T.label, "keyword", "keyword", v_' + this.graph.vertices.keyword[keyword].modelId + '_id,\"isKeyword\", true).id(); l << ' + this.graph.vertices.keywords[keyword].modelId + ';';
					ddlBindings['v_' + this.graph.vertices.keywords[keyword].modelId + '_id'] = keyword;												 	    


					gremlinArtifacts.push({ 
											mId: this.graph.vertices.keywords[keyword].modelId,
											ddl: ddl,
											bindings: ddlBindings
										  });			      	 	
				     
				  }.bind(this));


		// export metadata for edges originating from user vertices
		// gremlin artifacts: <fromVertex>.addEdge(<edge_label>, <toVertex>)
		//                   def uX = g.V().has("userId","uid").next(); uX.addEdge("is_in_channel", g.V().has("channelId","cid").next())
		ddl = null;
		ddlBindings = null;

		_.forEach(Object.keys(this.graph.vertices.users), 
			      function (userId) {
			      	ddl = 'if(g != null) {def g = graph.traversal();} def ' + this.graph.vertices.users[userId].modelId + ' = g.V().has("userId",' + 'v_' + this.graph.vertices.users[userId].modelId + '_id' + ').next();';
			      	ddlBindings = {};
			      	ddlBindings['v_' + this.graph.vertices.users[userId].modelId + '_id'] = userId;

					if(this.graph.vertices.users[userId].outEdges.hasOwnProperty('is_in_channel')) {
						// iterate through 
						_.forEach(this.graph.vertices.users[userId].outEdges.is_in_channel, 
							      function(isInChannelEdge) {
									// isInChannelEdge properties: (1) edgeId, (2) modelId, (3) channelId and (4) messageCount
									ddl = ddl + this.graph.vertices.users[userId].modelId + '.addEdge("is_in_channel", g.V().has("channelId", v_' + isInChannelEdge.modelId + '_id, "messageCount", v_' + isInChannelEdge.modelId + '_mc).next());'; 
									ddlBindings['v_' + isInChannelEdge.modelId + '_id'] = isInChannelEdge.channelId;	
									ddlBindings['v_' + isInChannelEdge.modelId + '_' + this.graph.vertices.users[userId].modelId + '_mc'] = isInChannelEdge.messageCount;	
							      }.bind(this));
					}

					// 
					gremlinArtifacts.push({ 
											ddl: ddl,
											bindings: ddlBindings
										  });

			      }.bind(this));


		return gremlinArtifacts;

	};
	*/

	/* ------------------------------------------------------------------------------------------------
	 *
	 * static method(s)
	 *
	 * ------------------------------------------------------------------------------------------------
	 */


	/**
	 * Loads a serialized graph model 
	 * @param {string} graphModel - output generated by exportGraphToJSON
	 * @param {callback} done - invoked after the graph has been instantiated using the provided graph model. done(error) is called if an issue was encountered, done(null, SlackGraphModel) otherwise
	 */
	var importGraphfromJSON = function(graphModel, done) {

		if((graphModel.hasOwnProperty('slack-team-name')) && 
		   (graphModel.hasOwnProperty('graph-definition')) && 
		   (graphModel.hasOwnProperty('model-info')) && 
		   (graphModel['model-info'].hasOwnProperty('uuid-counters'))) {
	  
	  		// create new Slack Graph model instance
			var sgm = new SlackGraphModel(graphModel['slack-team-name']);

			// load uuid counters
			sgm.idCounters.user = graphModel['model-info']['uuid-counters'].user;
			sgm.idCounters.channel = graphModel['model-info']['uuid-counters'].channel;
			sgm.idCounters.keyword = graphModel['model-info']['uuid-counters'].keyword;
			sgm.idCounters.mUser = graphModel['model-info']['uuid-counters'].mUser;
			sgm.idCounters.mChannel = graphModel['model-info']['uuid-counters'].mChannel;
			sgm.idCounters.mKeyword = graphModel['model-info']['uuid-counters'].mKeyword;
			sgm.idCounters.iiChannel = graphModel['model-info']['uuid-counters'].iiChannel;

			// load vertices and their associated edges 
			sgm.graph.vertices = graphModel['graph-definition'].vertices;

			return done(null, sgm);

		}
		else {
			console.error(graphModel);
			return done('The input is not a valid Slack graph model.');
		}

	}; // importGraphfromJSON


module.exports.SlackGraphModel = SlackGraphModel;			// class
module.exports.importGraphfromJSON = importGraphfromJSON;	// static method
