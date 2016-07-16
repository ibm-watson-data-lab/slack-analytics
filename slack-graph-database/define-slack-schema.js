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
   
const IBMGraphClient = require('ibm-graph-client');

/*
 * Define the Slack graph schema in IBM Graph.
 * 
 * Invocation: node define-slack-schema.js -f schema/slack-graph-schema.json
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
   argv.info( 'Use this script to define the Slack graph schema in an IBM Graph instance.' );
   const schemaFileName = argv.option({ name: 'schema', short: 's', description: 'Slack graph schema file name', type: 'path' }).run().options.schema;

   if(! schemaFileName) {
    argv.help();
    process.exit(1);    
   }

/*
 * Verify that the application is bound to a Graph database
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
 * Establish connectivity to the Graph database
 */

 var GraphClient = new IBMGraphClient({url: graphServiceCredentials.apiURL, 
                                   username: graphServiceCredentials.username, 
                                   password: graphServiceCredentials.password});

 
/*
 *  Create schema for Slack graph; see http://s3.thinkaurelius.com/docs/titan/1.0.0/schema.html
 */

console.log('Defining Slack schema in IBM Graph instance ' + graphServiceCredentials.apiURL);

GraphClient.session(function (error, token){

	GraphClient.config.session = token;

	GraphClient.schema().set(require(schemaFileName),
                       function(error, response){
                            if(error) {
                               console.error('Error defining Slack schema in IBM Graph: ' + error);
                               console.error('Details: ' + response.message);
console.log(require('util').inspect(response));                               
console.log(require('util').inspect(response.message)); 
console.log(require('util').inspect(error)); 
                            }
                            else {
                                console.log('IBM Graph response: ' + response.status.code + ' ' + response.status.message);
                                debug(response);
                            }
	});
});
