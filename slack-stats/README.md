### Collect and prepare Slack data

* Clone the Slack analytics artifacts

	```
	$ git clone https://github.com/ibm-cds-labs/slack-analytics.git
	$ cd slack-analytics
	```

* Install the module dependencies in the `slack-stats` directory

	  ```
	  $ cd slack-stats
	  $ npm install
	  ```

* Export the message history for the Slack team you want to analyze

    * As administrator, [log in to your Slack team](https://slack.com/).
    * Follow [these instructions](https://get.slack.help/hc/en-us/articles/201658943-Exporting-your-team-s-Slack-history) to export the team's message history.

    	> The message history does not include private channels or direct messages.

    * After the export has completed, download the ZIP file to a local machine.
    > Example export file name: `demo-team Slack export May 3 2016.zip`

    * Extract the ZIP file into a secure temporary directory.

* Collect the following information:
    * Slack team name
    > Example: demo-team  

    * Location of the extracted ZIP file
 
    	> Example: `/home/wolli/demo-team Slack export May 3 2016/`  

    * Location of the extracted `channels.json` file
    
    	> Example: `/home/wolli/demo-team Slack export May 3 2016/channels.json`  
  
* Collect Slack statistics

 ```
 $ node --expose-gc collect-slack-stats.js -d </path/to/extracted/zip-file/> -n <slack-team-name> 
 ```

 > If file `channels.json` is not located in `</path/to/extracted/zip-file/>` you must specify option `-c </path/to/channels.json>`
 
 The generated statistics file is named `<slack-team-name>-stats.json`. 

