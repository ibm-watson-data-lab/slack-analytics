[ **< Analytics for Slack** Home](https://github.com/ibm-cds-labs/slack-analytics) 
## Prepare IBM Graph for Slack Analytics

If you haven't already, follow the Slack [statistics collection instructions](https://github.com/ibm-cds-labs/slack-analytics/tree/master/slack-stats) to collect the data that you want to load into IBM Graph.

###Prerequisites

 * Take note of the location of the two generated statistics files `<slack-team-name>-stats.json` and `<slack-team-name>-keyword-stats.json`. 
 * Take note of the location of `channels.json` and `users.json`. These two files are included in the extracted Slack message archive file.

 ![](https://github.ibm.com/analytics-advocacy/slack-analytics-sandbox/blob/initial/slack_graph_model.png?raw=true)

* Install the module dependencies in the `slack-graph-database` directory

    ```
    $ cd slack-graph-database
    $ npm install
    ```


### Provision an IBM Graph service instance and bind it to Graph setup scripts

* Create a new IBM Graph service instance in Bluemix named **slack-graph-database**

    ```
    $ cf create-service "IBM Graph" Entry slack-graph-database
    ```

* Create service credentials for this service instance

    ```
    $ cf create-service-key slack-graph-database Credentials-1
    ```

* Collect the service credentials 

    ```
    $ cf service-keys slack-graph-database
    name
    Credentials-1
  
    $ cf service-key slack-graph-database Credentials-1
    Getting key Credentials-1 for service instance slack-graph-database as some.user@some.company...
    {
      "apiURL": "your-IBM-Graph-instance-API-URL",
      "password": "your-IBM-Graph-instance-password",
      "username": "your-IBM-Graph-instance-username"
    }
    ```

* Bind the service instance to the setup scripts

    * **Binding using a configuration file** 
        * Locate file `vcap_services_template.json` in the `slack-graph-database` directory and rename it to `vcap_services.json`.
        * Replace the dummy credentials with the credentials of your service instance:

            ```
            "..." : "...",
            "credentials": {
              "apiURL": "TODO-REPLACE-WITH-your-IBM-Graph-instance-API-URL",
              "username": "TODO-REPLACE-WITH-your-IBM-Graph-instance-username",
              "password": "TODO-REPLACE-WITH-your-IBM-Graph-instance-password"
            }
            ```

    * **Binding using an environment variable** 

        * Define environment variable VCAP_SERVICES using the appropriate service credentials
      
            ```
            {"IBM Graph":[{"name":"slack-graph-database","label":"IBM Graph","plan":"Entry","credentials":{"apiURL":"TODO-REPLACE-WITH-your-IBM-Graph-instance-API-URL","username":"TODO-REPLACE-WITH-your-IBM-Graph-instance-username","password":"TODO-REPLACE-WITH-your-IBM-Graph-instance-password"}}]}
            ```

### Define the Slack schema in your IBM Graph service instance

  Run the `define-slack-schema.js` script to define the Slack schema.

  ```
  $ node define-slack-schema.js -s schema/slack-graph-schema.json
  ```
  
### Generate the Slack graph model for your team

  Run `build-slack-graph-model.js` to generate a Slack graph model file using the statistics files that you [generated earlier](https://github.com/ibm-cds-labs/slack-analytics/tree/master/slack-stats).

  ```
  $ node build-slack-graph-model.js -s </path/to/><slack-team-name>-stats.json -k </path/to/><slack-team-name>-keyword-stats.json -c </path/to/>channels.json -u </path/to/>users.json -n <slack-model-name>
  ```

 > Example: 
 > ```node build-slack-graph-model.js -s ../stats/demo-team-stats.json -k ../stats/demo-team-keyword-stats.json -c /home/wolli/channels.json -u /home/wolli/users.json -n demo-team-0801```

The generated Slack graph model file `<slack-model-name>.sgm` is used in the next step to load the graph into the IBM Graph service instance.

### Load the Slack graph model into your IBM Graph service instance

  ```
  $ node load-slack-graph-model.js -m </path/to/><slack-model-name>.sgm
  ```

   > Example: 
 > ```node load-slack-graph-model.js -m demo-team-0801.sgm```

### Query the Slack graph 

Once the graph has been built you can query it.


#### Query the graph using the Query Builder

   The Query Builder in the IBM Graph web console in Bluemix provides a simple interface to query the graph using the Gremlin query language. Results are returned in JSON.

   ![Graph query in Bluemix](img/IBM_graph_query_builder_in_Bluemix.png)
  
#### Sample applications

   Use the [sample Slack slash command](https://github.com/ibm-cds-labs/slack-analytics-about-service) to let Slack users query the graph.
   
   ![Slack social graph interaction](https://raw.githubusercontent.com/ibm-cds-labs/slack-analytics-about-service/master/media/slash-command-demo.gif)
    
#### Programmatic graph traversal
    
Create an application that uses the [REST API](https://ibm-graph-docs.ng.bluemix.net/api.html) or the (inofficial) [node.js library](https://github.com/ibm-cds-labs/nodejs-graph) to traverse the graph.


