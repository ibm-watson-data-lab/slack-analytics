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

const cfenv = require('cfenv'),
      async = require('async'),
	  util = require('util'),
	  _ = require('lodash'),
	  fs = require('fs'),
	  argv = require('argv'),
      debug = require('debug')('slack_graph_setup');
   
const IBMGraphClient = require('ibm-graph-client');

/*
 * Run a set of gremlin scripts that are stored in a file: run-gremlin-batch.js --file, -f <file name>
 *
 * File conventions:
 *  - 1 line per gremlin script
 *  - comments start  with --
 *    -- I am a comment
 *  - gremlin script format:
 *    def g = graph.traversal(); g.V().has("userId", "U03FXGXPR").id() 
 *  - gremlin script without binding:
 *	  {"gremlin": "def g = graph.traversal(); g.V().has(\"userId\", \"U03FXGXPR\").id()"}
 *	- gremlin script with binding:
 *    {"gremlin": "def g = graph.traversal(); g.V().has(\"userId\", var0).id()", "bindings":{"var0":"U03FXGXPR"}}
 *
 *
 * To bind an instance when running this application locally, copy the Bluemix service "credentials" property into file vcap.services.
 * [ ----------------- Example content ----------------- ]
 * 
 *    {
 *     "IBM Graph": [
 *      {
 *          "name": "slack-graph-database",
 *          "label": "IBM Graph",
 *          "plan": "Standard",
 *          "credentials": {
 *            "apiURL": "https://ibmgraph-alpha.ng.bluemix.net/9c6e7377-82a4-4dad-a1e2-4223e776349A/g",
 *            "username": "d3c76e27-5d3b-4b68-9dBc-278326cD3bc7",
 *            "password": "121212-c354-444-55-66666"
 *         }
 *      }
 *     ]
 *   }
 *
 * [ ----------------- End example content ----------------- ]
 */

/*
 * Verify that the application is bound to an IBM Graph instance.
 */
	var appEnv = null;

	try {
	  appEnv = cfenv.getAppEnv({vcap: {services: require('./vcap_services.json')}});
	}
	catch(ex) {
	  appEnv = cfenv.getAppEnv();
	}

 	var graphServiceCredentials = appEnv.getServiceCreds('slack-graph-database');

	if(! graphServiceCredentials) {
      throw new Error('This application is not bound to a Bluemix hosted IBM Graph. Set the VCAP_SERVICES environment variable or add the service information to file vcap_services.json.');
	}

/*
 * Process command line parameters
 */
	const gremlinFileName = argv.option({ name: 'file', short: 'f', description: 'Gremlin script file name', type: 'path' }).run().options.file;
	//const gremlinFileName = args.options.file;

	if(! gremlinFileName) {
		argv.help();
		process.exit(1);		
	}

/*
 * Create graph DB client and obtain session token
 */

    var GraphClient = new IBMGraphClient({url: graphServiceCredentials.apiURL, username: graphServiceCredentials.username, password: graphServiceCredentials.password});

	// obtain session token from Graph DB
	GraphClient.session(function (error, token){
		GraphClient.config.session = token;
	});

/*
 * Load and process files
 */

	console.log('Loading gremlin scripts from file ' + gremlinFileName);

	var gremlinScripts = null;

	try {
		gremlinScripts = fs.readFileSync(gremlinFileName, 'utf8');	
	}
	catch(exception) {
		console.error('Input file ' + gremlinFileName + ' could not be loaded: ' + exception);
		process.exit(1);
	}
	
	var payload = null;
	var lineCounter = 0;
	var scriptCounter = 0;

	// run each gremlin script sequentially
	async.eachSeries(gremlinScripts.split('\n'), function(script, callback) {	

		lineCounter++;

		if((script.search(/^[\s\r]*$/) === -1) && (script.search(/^[\s]*\-\-/) === -1))  {

			scriptCounter++;

			// valid line formats: 
			//  def g = graph.traversal(); g.V().has("userId", "U03FXGXPR").id() 
			//  {"gremlin": "def g = graph.traversal(); g.V().has(\"userId\", \"U03FXGXPR\").id()"}
			//  {"gremlin": "def g = graph.traversal(); g.V().has(\"userId\", var0).id()", "bindings":{"var0":"U03FXGXPR"}}

			try {
				payload = JSON.parse(script);
			}
			catch(exception) {
				payload = { gremlin : script };
			}

			if(! payload.gremlin) {
				return callback();		// nothing to do
			}

			console.log('> ' + payload.gremlin);

			// submit request
			GraphClient.gremlin(payload,
							  function(error, response){
							  	if(error) {
							  	   console.error(' Status  => ' + response.code + ' message => ' + response.message);
							  	   return callback(error);
							  	}
							  	else {
                                    if(response.result.data.length > 0) {
                                         _.forEach(response.result.data, function (result) {
                                            console.log('Result: ' + util.inspect(result));
                                            if(result.properties) {
                                              console.log(' => Properties: ' + util.inspect(result.properties));  
                                            }
                                            
                                         });
                                     }
                                     else {
                                        console.log('Result: ' + util.inspect(response.result));
                                     }

                                     console.log('Result set size: ' + response.result.data.length);

							  		return callback();
							  	}							  	   
							  });

		}
		else {
			// skip comments and lines containing only fillers	
			return callback();	
		}
		
	},
	function (error) {
		if(error) {
			console.error('Script execution aborted in line ' + lineCounter + ' with error: ' + error);
		}
		else {
			debug('Total line count: ' + lineCounter);
			console.log('Script execution complete. ' + scriptCounter + ' scripts were processed.');	
		}
	});
