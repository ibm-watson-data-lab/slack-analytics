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

const _ = require('lodash'),
      cfenv = require('cfenv'),
      async = require('async'),
      readline = require('readline'),
      util = require('util'),
      debug = require('debug')('slack_graph_util');
   
const IBMGraphClient = require('ibm-graph-client');

/*
 * Interactively query an IBM Graph instance.
 * 
 * Invocation: node query-graph.js
 * 
 * To bind an IBM Graph instance when running this application locally, copy the Bluemix service "credentials" property into file vcap.services.
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
 *        }
 *     ]
 *   }
 *
 * [ ----------------- End example content ----------------- ]
 */

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
      throw new Error('This application is not bound to a Bluemix hosted IBM Graph. Set the VCAP_SERVICES environment variable or add the service information to file vcap_services.json.');
  }

  var GraphClient = new IBMGraphClient({url: graphServiceCredentials.apiURL, username: graphServiceCredentials.username, password: graphServiceCredentials.password});

  // obtain session token from Graph DB
  GraphClient.session(function (error, token){

    GraphClient.config.session = token;

  });

  /*
      sample gremlin scripts
  def g = graph.traversal(); g.V(16424)

  def g = graph.traversal(); g.V().has('userId','U03EQ28J9')
  def g = graph.traversal(); g.V().has('userId','U03EQ28J9').properties()
  def g = graph.traversal(); g.V().has('userId','U03EQ28J9').out('mentions_user').values('userId')
  def g = graph.traversal(); g.V().has('userId','U03EQ28J9').out('mentions_user').properties()
  def g = graph.traversal(); g.V().has('isUser', true).outE('is_in_channel').has("messageCount", gt(30))

  def g = graph.traversal(); g.V().has('userId','U03EQ28J9').out('mentions_user').count()
  def g = graph.traversal(); g.V().has('isUser', true)
  def g = graph.traversal(); g.E().has('channelName', 'vacation')

   *** these won't work ***
   def g = graph.traversal(); g.V().count()
   def g = graph.traversal(); g.V().hasLabel('user')
   def g = graph.traversal(); g.V().has('userId')

  */

var go = true;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Enter your gremlin script or \'quit\' to end your session. Omit def g = graph.traversal();');

async.doWhilst(function(callback) {

            rl.question('> ', (script) => {
           
                if(script === 'quit') {       
                    go = false;
                    return callback();
                }

                console.log('Processing script: def g = graph.traversal(); ' + script);

                GraphClient.gremlin('def g = graph.traversal(); ' + script, 
                                    function(error, response){
                                        if(error) {
                                            console.error('queryGraph - error: ' + error);
                                            console.error(' response: ' + util.inspect(response));
                                        }
                                        else {    
                                             debug('queryGraph response: ' + util.inspect(response));
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
                                        }
                                        return callback();    
                }); // gremlin
            });

          },
          function () {

                return go;
          },
          function (error) {
                if(error) {
                  console.error('Error: ' + error);
                }
                console.log('Bye.');
                rl.close();
          });

