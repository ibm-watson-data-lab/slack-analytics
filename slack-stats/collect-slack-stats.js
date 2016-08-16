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

const fs = require('fs'),
	argv = require('argv'),
    path = require('path'),
	async = require('async'),
	_ = require('lodash'),
	debug = require('debug')('slack_stats:data_collection');

const slackMsgParser = require('./lib/slackMsgParser.js');
const slackMsgTextParser = require('./lib/slackMsgTextParser.js');
const ChannelStats = require('./lib/channelStatistics.js');
const UserMsgStats = require('./lib/userMsgStatistics.js');

var msg = null;


// --------------------------------------

var fileCount = 0;

var jobResults = [];

	/*
	 * @param {string} channelName - 
	 * @param {string} dir - local file system directory
	 * @param {callback} callback - 
	 */
	var processChannel = function(channelName, dir, callback) {

		var channelStats = new ChannelStats(channelName),
		    userMsgStats = new UserMsgStats(channelName);
		

		fs.readdir(dir,
	           function(err, files) {

	    	var msgFile = null;       	
	    	console.log('Loading ' + files.length + ' message files for channel ' + channelName);

	    	fileCount = fileCount + files.length;

	    _.forEach(files, function(file) {

	    	msgFile = JSON.parse(fs.readFileSync(dir + file));

	   		_.forEach(msgFile, function(message) {

				msg = slackMsgParser.parseMsg(message);

				if(msg) {

					channelStats.update(msg);
					userMsgStats.update(slackMsgTextParser.parseMsgText(msg));

					msg = null;
				}
				else {
					console.log('no message');
				}
				message = null;
			});

			msgFile = null;

	    });       	
	    	files = null;

	    	global.gc();

	    	jobResults.push(userMsgStats);

	    	console.log('Done processing channel ' + channelName);
	    	return callback(null); 	

		});


	};

// ---------------------------------------------------------------------------------------------------------------------
// 
// ---------------------------------------------------------------------------------------------------------------------


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
		console.error('Error. This script must be invoked as follows: node --expose-gc collect-slack-stats.js <options>');		
		argvInvalid = true;		
	}

	if(argvInvalid) {
			argv.help();
			console.log('Example: node --expose-gc collect-slack-stats.js -d "/home/IBM CDS Slack export Apr 28 2016" -n "IBM Cloud Data Services"');
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


var rootdir = messageFileDirectory;

console.log('Scanning directory ' + rootdir);

var channelCount = 0;

console.time('Elapsed time');

	/*
	 Fetch list of files/directories in the extracted <rootdir>, e.g. "IBM Cloud Data Services Slack export Feb 5 2016/"
	 The typical file system structure in this directory is 
	 	channelName1/
	 	channelName1/yyyy-mm-dd.json     // one message file per day
	 	channelName1/yyyy-mm-dd.json
		...
	 	channelNameN/
	 	channelNameN/yyyy-mm-dd.json     // one message file per day
	 	channelNameN/yyyy-mm-dd.json
	 	channels.json 					 // metadata file for Slack channels
	 	integration_logs.json            // metadata file for Slack integrations
	 	users.json                       // metadata file for Slack users

	 */
	fs.readdir(rootdir,
               function(err, files) {

               	// process files/directories in rootdir sequentially
           		async.eachSeries(files, 
           						 function process(file, callback) {

           						 	// if "file" is a directory we assume it identifies a channel and contains one or more json message files
           						 	fs.stat(path.join(rootdir, file, path.sep), function(err, stats) {
           						 		if((stats) && (stats.isDirectory())) {
           						 			channelCount++;
           						 			// process files in this directory
           						 			processChannel(mapping[file] || file, path.join(rootdir, file, path.sep), callback);		
           						 		}
           						 		else {
           						 			console.log('Skipping file ' + file);
           						 			return callback();
           						 		}
           						 	});           						 	
								}, 
							    function (err){
							    	if(err) {
							    		console.log('Processing failure: ' + err);
							    	}
							    	console.log('Analyzed ' + fileCount + ' Slack message files.');
				           			console.timeEnd('Elapsed time');

				           			if(jobResults.length > 0) {
					           			var outFile = slackTeamName + '-stats.json';
					           			console.log('Saving statistics to ' + outFile);

					           			var stream = fs.createWriteStream(outFile);
					           			stream.once('open', function() {
						           			stream.write('[');
						           			for(var i = 0; i < jobResults.length; i++)	 {
						           				stream.write(jobResults[i].toJSON());
						           				if(i+1 < jobResults.length) {
						           					stream.write(',');
						           				}
						           			}
						           			stream.write(']');
	 										stream.end();
	 										console.log('Saved generated statistics for ' + jobResults.length + ' channels in file ' + outFile +'.');	 										
										});

					           		}
					           		else {
					           			console.log('No statistics were generated.');
					           		}
           		});           		
           });
