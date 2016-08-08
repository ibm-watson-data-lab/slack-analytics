### Collecting and preparing Slack data

Slack message archives contain records of user activity in [public] channels. These records identify users, topics, references to other users, references to channels, etc. To gain insights - such as who is active in a channel and which topics are discussed in a channel - follow these instruction to extract the relevant information for later processing.

![Building a Slack graph](http://developer.ibm.com/clouddataservices/wp-content/uploads/sites/47/2016/08/sa_build_graph.png)

####Prerequisites
Before you can collect and prepare the data, verify 

 * that you have administrator access to the Slack team of interest (or can access the team's exported message archives),
 * that Node.js is installed locally and
 * can get access to a [Watson Alchemy API service](https://console.ng.bluemix.net/catalog/services/alchemyapi/) in Bluemix.

####Preparation

##### Export the message history archives for the Slack team you want to analyze

   1. As administrator, [log in to your Slack team](https://slack.com/).
   2. Follow [these instructions](https://get.slack.help/hc/en-us/articles/201658943-Exporting-your-team-s-Slack-history) to export the team's message history.

    > The message history does not include private channels or direct messages.

   3. After the export has completed, download the ZIP file to a local machine.

    > Example export file name: `demo-team Slack export May 3 2016.zip`

   4. Extract the ZIP file into a secure temporary directory.

   5. Take note of the following information:
    * Slack team name
    > Example: demo-team  

    * Location of the extracted ZIP file
 
        > Example: `/home/wolli/demo-team Slack export May 3 2016/`  

    * Location of the extracted `channels.json` file
    
        > Example: `/home/wolli/demo-team Slack export May 3 2016/channels.json`  

    * Location of the extracted `users.json` file
    
        > Example: `/home/wolli/demo-team Slack export May 3 2016/users.json`          

#####Download and install the setup utilities

1. Clone the Slack analytics repository

	```
	$ git clone https://github.com/ibm-cds-labs/slack-analytics.git
	$ cd slack-analytics
	```

2. Install the module dependencies in the `slack-stats` directory

	  ```
	  $ cd slack-stats
	  $ npm install
	  ```
  
#### Collect Slack statistics

Collect statistics about users, channels and keywords. These statistics are used to build a graph that represents these entities and their relationships.

##### Collect social statistics 

Social statistics track relationships between users and Slack channels, such as "_John mentioned Jenny in the cooking channel_" and "_Fay mentioned the home-brewing channel in the beer channel_".

1. Run `collect-slack-stats.js` and specify the location of the extracted message files and the Slack team name as parameters.

    ```
    $ node --expose-gc collect-slack-stats.js -d </path/to/extracted/zip-file/> -n <slack-team-name> 
    ```


    > If file `channels.json` is not located in `</path/to/extracted/zip-file/>` you must specify option `-c </path/to/channels.json>`

Upon successful completion, the user and channel statistics for team &lt;slack-team-name&gt; are stored in file `<slack-team-name>-stats.json`.

##### Optional: Collect keyword statistics 

Keyword statistics associate keywords with users that mentioned them and channels that they were used in. This optional collection process leverages the Watson Alchemy keyword API to extract the relevant information from the Slack message archive files.

 1. Provision a new Alchemy API service instance in Bluemix 

    ```
    $ cf create-service "alchemy_api" free slack-alchemy-api
    ```
    
    > The Free Plan includes 1,000 events per day per Bluemix Organization. You can only have one instance at a time of the AlchemyAPI service and one AlchemyAPI credential in the Free plan.

 2. Create service credentials for this service instance

    ```
    $ cf create-service-key slack-alchemy-api Credentials-1
    ```

 3. Collect the service credentials 

    ```
    $ cf service-keys slack-alchemy-api
    name
    Credentials-1
  
    $ cf service-key aslack-alchemy-api Credentials-1
    Getting key Credentials-1 for service instance slack-alchemy-api as some.user@some.company...
    {
     "apikey": "1234567890ALCHEMYKEY0987654321",
     "note": "It may take up to 5 minutes for this key to become active",
     "url": "https://gateway-a.watsonplatform.net/calls"
    }
    ```
    
    > To determine how many API events you have consumed invoke the following API, passing your API key as parameter: `http://access.alchemyapi.com/calls/info/GetAPIKeyInfo?apikey=<apikey>`
    
    > Example output for the free plan: 
    
     ```
<?xml version="1.0" encoding="UTF-8"?>
	<results>
    		<status>OK</status>
    		<consumedDailyTransactions>0</consumedDailyTransactions>
    		<dailyTransactionLimit>1000</dailyTransactionLimit>
	</results>
     ```
    

 4. Bind the service instance to the collection scripts

    * **Binding using a configuration file** 
        * Locate file `vcap_services_template.json` in the `slack-stats` directory and rename it to `vcap_services.json`.
        * Replace the dummy credentials with the credentials of your service instance:

            ```
            "..." : "...",
            "credentials": {
                "url": "TODO-REPLACE-WITH-your-Alchemy-API-instance-URL",
                "note": "It may take up to 5 minutes for this key to become active",
                "apikey": "TODO-REPLACE-WITH-your-Alchemy-API-instance-key"
            }
            ```

    * **Binding using an environment variable** 

        * Define environment variable VCAP_SERVICES using the appropriate service credentials
      
            ```
            {"alchemy_api":[{"name":"slack-alchemy-api","label":"alchemy_api","plan":"free","credentials":{"url": "TODO-REPLACE-WITH-your-Alchemy-API-instance-URL", "note": "It may take up to 5 minutes for this key to become active", "apikey": "TODO-REPLACE-WITH-your-Alchemy-API-instance-key"}}]}
            ```

 5. Collect keyword statistics

    > Note: Alchemy's free plan allows for up to 1,000 API invocations per day. Once the limit is reached (`{"error":"daily-transaction-limit-exceeded","code":400}`) the keyword collection process is stopped.

    Run `collect-keyword-stats.js` and specify the location of the extracted message files and the Slack team name as parameters.
```
    $ node --expose-gc collect-keyword-stats.js -d </path/to/extracted/zip-file/> -n <slack-team-name>
```


    > If file `channels.json` is not located in `</path/to/extracted/zip-file/>` you must specify option `-c </path/to/channels.json>`

Upon successful completion, keyword statistics for team &lt;slack-team-name&gt; are stored in file `<slack-team-name>-keyword-stats.json`

### Load the statistics into IBM Graph
To explore relationships between users, channels and keywords [load the collected statistics into IBM Graph](https://github.com/ibm-cds-labs/slack-analytics/tree/master/slack-graph-database). 
 

