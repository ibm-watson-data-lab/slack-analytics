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
      argv = require('argv'),
      debug = require('debug')('slack_graph_util');
   
var gmio = require('./lib/graph_model_io.js'); 

var IBMGraphClient = require('ibm-graph-client');

/*
 * Load a Slack graph model into an IBM Graph instance.
 * 
 * Invocation: node load-slack-graph-model.js -f path/to/<slack-model-name>.sgm
 * 
 * To bind an IBM Graph instance when running this application locally, copy the Bluemix service "credentials" property into file vcap.services.
 * [ ----------------- Example content ----------------- ]
 * 
 *    {
 *     "IBM Graph": [
 *      {
 *          "name": "slack-graph-database",
 *          "label": "IBM Graph",
 *          "plan": "Entry",
 *          "credentials": {
 *            "apiURL": "https://ibmgraph-alpha.ng.bluemix.net/9c6e7377-82a4-4dad-a1e2-4223e776349A/g",
 *            "username": "d3c76e27-5d3b-4b68-9dBc-278326cD3bc7",
 *            "password": "121212-c354-444-55-66666"
 *         }
 *        }
 *     ]
 *   }
 *
 * [ ----------------- End example content ----------------- ]
 */

/*
 * Process command line parameters
 */
	 argv.info( 'Use this script to load a serialized Slack graph model file into a Bluemix Graph DB instance.' );
	 const modelFileName = argv.option({ name: 'model', short: 'm', description: 'Graph model file name', type: 'path' }).run().options.model;

	 if(! modelFileName) {
		argv.help();
		process.exit(1);		
	 }

/*
 * Establish connectivity to the Graph database
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
	    console.error('This application is not bound to a Bluemix hosted IBM Graph. Set the VCAP_SERVICES environment variable or add the service information to file vcap_services.json.');
	   	process.exit(1);
	 }

	/*
	 * Instantiate IBM Graph client
	 */

	 var GraphClient = new IBMGraphClient({url: graphServiceCredentials.apiURL, 
	 	                                   username: graphServiceCredentials.username, 
	 	                                   password: graphServiceCredentials.password});

	 // obtain session token 
	 GraphClient.session(function (error, 
							       token){
							GraphClient.config.session = token;
	 });

/*
 * Load slack graph model from disk into memory
 */
 console.log('Loading lack graph model from file ' + modelFileName);
 console.time('File load time');
 gmio.loadModelfromFile(modelFileName, 
 	                    function(error, model){
	if(error) {
		console.error('Error loading in-memory graph model from file ' + modelFileName + ':' + error);
	}
	else {

		console.timeEnd('File load time');		
		debug(JSON.stringify(model.getModelStatistics()));

		// create model in Graph DB
		console.time('Model load time');
		new gmio.GraphModelIO(model).saveModelInGraphDB(GraphClient, 
														function(error) {
															console.timeEnd('Model load time');

															if(error) {
															 	console.error('Error loading model into Graph DB instance ' + graphServiceCredentials.apiURL + ' : ' + error);
															}
															else {													 
																 GraphClient.gremlin('def r = []; def g = graph.traversal(); r << g.V().has("isChannel", true).count().next(); r << g.V().has("isUser", true).count().next(); r << g.V().has("isKeyword", true).count().next(); r << g.V().has("isUser", true).outE("is_in_channel").count().next(); r << g.V().has("isUser", true).outE("mentions_channel").count().next(); r << g.V().has("isUser", true).outE("mentions_user").count().next(); r << g.V().has("isKeyword", true).inE("mentions_keyword").count().next(); r << g.V().has("isKeyword", true).outE("used_in_channel").count().next(); r;',
																                 function (error, response) {
																                    if((response) && (response.result) && (response.result.data)) {
																                      console.log('Graph DB instance ' + graphServiceCredentials.apiURL + ' graph details:');	
																                      console.log('Channel vertices             : ' + response.result.data[0]);  
																                      console.log('User vertices                : ' + response.result.data[1]);
																                      console.log('Keyword vertices             : ' + response.result.data[2]);
																                      console.log('[User] is_in_channel edges   : ' + response.result.data[3]);  
																                      console.log('[User] mentions_channel edges: ' + response.result.data[4]);  
																                      console.log('[User] mentions_user edges   : ' + response.result.data[5]); 
																                      console.log('[User] mentions_keyword edges: ' + response.result.data[6]);
																                      console.log('[Keyword] used_in_channel edges: ' + response.result.data[7]);
																                    }
																                    else {
																                      console.error('Request execution error: ' + error + ' ' + response.code + ' ' + response.message);
																                    }
																                 }); 
														}});
	}
 });
