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

const argv = require('argv'),
	  cfenv = require('cfenv'),
	  fs = require('fs'),
	  path = require('path'),
	  _ = require('lodash');

const debug = require('debug')('slack_stats:data_collection');

const keywordExtractor = require('./lib/keywordExtractor');

/* 
	-------------------------------------------------------------------------------------------------------------------------------------
	Parameters:
		-d /path/to/extracted/slack/message_dir/ 	(required)
		-n slack_team_name 							(required)
		-c /path/to/extracted/slack/channels.json 	(required if channels.json is not located in /path/to/extracted/slack/message_dir/ )
	Services: 
		See vcap_services_template.json
		{
		  "alchemy_api": [
		    {
		      "name": "slack-alchemy-api",
		      "label": "alchemy_api",
		      "plan": "free",
		      "credentials": {
        		"url": "TODO-REPLACE-WITH-your-Alchemy-API-instance-URL",
        		"note": "It may take up to 5 minutes for this key to become active",
        		"apikey": "TODO-REPLACE-WITH-your-Alchemy-API-instance-key"
		      }
		    }
		  ]        
		}
	Debug switches:
			slack_graph_setup:knowledge_graph_util
	-------------------------------------------------------------------------------------------------------------------------------------
*/

	/*
 	 * Verify that an instance of the Alchemy API is bound to this application
 	*/
	var appEnv = null;

	try {
	   appEnv = cfenv.getAppEnv({vcap: {services: require('./vcap_services.json')}});
	}
	catch(ex) {
	   appEnv = cfenv.getAppEnv();
	}

	var alchemyServiceCredentials = appEnv.getServiceCreds('slack-alchemy-api');

	if(! alchemyServiceCredentials) {
	 	console.error('This application is not bound to an Alchemy API service instance. Set the VCAP_SERVICES environment variable or add the service information to file vcap_services.json.');
	 	process.exit(1);
	}

	/*
 	 * Process command line parameters
 	 */
	argv.info('Use this script to collect social statistics from a set of Slack message files.\n' + 
		      'Invoke this script using option --expose-gc providing the arguments listed below.\n');

	const args = argv.option([
								{ name: 'dir', short: 'd', description: 'Location of unloaded Slack messages', type: 'string', example: '-d </path/to/extracted/slack/message_dir/>' },
								{ name: 'name', short: 'n', description: 'Slack team name', type: 'string', example: '-n my-slack-team' },
								{ name: 'channel', short: 'c', description: 'Path to exported channels.json if this file is not located in the default location.', type: 'string', example: '-c </path/to/extracted/slack/>channels.json' }
							 ]).run();

	debug('Command line arguments: ' + JSON.stringify(args));

	const messageFileDirectory = args.options.dir || '',
		  slackTeamName = args.options.name,
		  channelFile = args.options.channel || path.join(messageFileDirectory, 'channels.json'); // use default location if not specified

	// validate command line parameters	  
	var argvInvalid = false;	  

	if(! messageFileDirectory) {
		console.error('Missing -d argument. Specify the Slack message directory option: -d </path/to/extracted/slack/message/files>.');		
		argvInvalid = true;
	}
	else {
		// verify that messageFileDirectory is a directory
		try {
			if(! fs.statSync(messageFileDirectory).isDirectory()) {
				console.error('Invalid -d argument. "' + messageFileDirectory + '" is not a directory.');		
			 	argvInvalid = true;
			}	
		}
		catch(ex) {
			console.error('Invalid -d argument. "' + messageFileDirectory + '" is invalid: ' + ex);
			argvInvalid = true;
		}
	}

	if(! slackTeamName) {
		console.error('Missing -n argument. Specify the Slack team name option: -n <my-slack-team-name>');		
		argvInvalid = true;
	}

	if(messageFileDirectory && channelFile) {

		if(! args.options.channel) {
			console.log('Argument -c was not specified. Using default.');	  
		}

		// verify that channelFile is a file
		try {
			if(! fs.statSync(channelFile).isFile()) {
				console.error('Invalid -c argument. "' + channelFile + '" is not valid. It is not a file.');		
			 	argvInvalid = true;
			}	
		}
		catch(ex) {
			console.error('Invalid -c argument. "' +  channelFile + '" is not valid: ' + ex + '.');
			argvInvalid = true;
		}
	}

	if(! _.find(process.execArgv, function(argv){return '--expose-gc' === argv;})) {
		console.error('Error. This script must be invoked as follows: node --expose-gc collect-keyword-stats.js <options>');		
		argvInvalid = true;		
	}

	if(argvInvalid) {
			argv.help();
			console.log('Example: node --expose-gc collect-keyword-stats.js -d "/home/IBM CDS Slack export Apr 28 2016" -n "IBM Cloud Data Services"');
			process.exit(1);
	}

	/*
 	 * Load channel mapping information.
     */

	var channelMappingEntries = null;
	var mapping = {};

	try {
	  channelMappingEntries = JSON.parse(fs.readFileSync(channelFile));
	  _.forEach(channelMappingEntries, function (entry) {
		 mapping[entry.name] = entry.id;
	  });
	}
	catch(exception) {
		console.error('Channel mapping information could not be loaded from file ' + channelFile + ': ' + exception);
		process.exit(1);
	}

	// initialize keyword extractor using Alchemy API key
	const ke = new keywordExtractor(alchemyServiceCredentials.apikey);

	/*
	 Create keyword statistics file for this Slack team:

		{ 
			"slack_team_name": "<my-slack-team-name>",		// Slack team name
			"collection_date": "2016-07-26T18:29:33.288Z",  // ISO 8601 formatted timestamp indicating when the extraction process was run
			"keyword_statistics": [
								   "<channel_id>": {
											    	"channel_keywords": [
																	      {
																	        "relevance": "0.991585",
																	        "text": "cloudant"
																	      },
																	      ...
																	    ],
													"user_data": {
															      "<INTERNAL_SLACK_USER_ID>": {
															        "message_count": 29,
															        "message_batches": [
															          					"..."
															        ],
															        "keywords": [
															          				{
															            				"relevance": "0.957723",
															            				"text": "dashDB"
															          				},
															          				...							    
								  												]
								  								  }			 
																 }
												   },
									...			   
								  ]
		}

	*/

	const keywordStatsFileName = slackTeamName + '-keyword-stats.json';
	const stream = fs.createWriteStream(keywordStatsFileName);

	var is_first = true;

	// invoked if a fatal error was encountered during keyword extraction
	ke.on('error', 
		  function(error) {
		  	console.error('A fatal error occurred while collecting keyword statistics for Slack team ' + slackTeamName + ': ' + JSON.stringify(error));
		  	stream.write('], "error_details": {"message": "' + error.error + '","code":' + error.code + '}}');
		  	// close output stream
		  	stream.end();
	});

	// invoked when keyword extraction has completed for a single channel
	ke.on('channelStats', 
		  function(stats) {
		  	debug('Saving keyword statistics for channel ' + Object.keys(stats)[0]);
		  	if(! is_first) {
		  	 stream.write(',');	
		  	}
		  	// stream.write(JSON.stringify({[stats.channel_name] : stats.keyword_stats}));
		  	stream.write(JSON.stringify(stats));
		  	is_first = false;
	});

	// invoked when keyword extraction has completed for all channels
	ke.on('done', 
		  function(message) {
		  	debug('Received notification that keyword extraction has completed for all channels.');
		  	console.log(message);
		  	stream.write(']}');
		  	stream.end();
		  	console.log('Keyword statistics for Slack team ' + slackTeamName + ' were saved in file ' + keywordStatsFileName + '.');
	});

	stream.once('open', 
				function() {
					stream.write('{ "slack_team_name": "' + slackTeamName + '",');
					stream.write('"collection_date": "' + new Date().toISOString() + '",');
					stream.write('"keyword_statistics": [');
					debug('Starting keyword extraction from Slack message archive directory ' + messageFileDirectory);
					// start keyword extraction
					ke.extract(messageFileDirectory,
			   				   mapping);				
				});