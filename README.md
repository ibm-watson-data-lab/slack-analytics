### Setup Analytics for Slack

![Build status](https://travis-ci.org/ibm-cds-labs/slack-analytics.svg?branch=master)

The Analytics for Slack demo utilizes the following Bluemix services:
 * [IBM Graph](https://console.ng.bluemix.net/catalog/services/ibm-graph/)
 * [Watson Alchemy API](https://console.ng.bluemix.net/catalog/services/alchemyapi/)

If you don't have a Bluemix account yet, [sign up](http://www.ibm.com/cloud-computing/bluemix/). It only takes a minute.

###Prerequisites

To set up this analytics for Slack demo you need to:
 * [download and install git](https://git-scm.com/download)
 * [download and install Node.js](https://nodejs.org/en/download/)
 * [download and install Cloud Foundry CLI](https://console.ng.bluemix.net/docs/starters/install_cli.html)
 * have administrative access to a Slack team to download message archives and configure an integration


###Getting started

1. Clone the Analytics for Slack demo artifacts

 	```
 	$ git clone https://github.com/ibm-cds-labs/slack-analytics.git
 	$ cd slack-analytics
 	```

2. Collect [Slack statistics](https://github.com/ibm-cds-labs/slack-analytics/tree/master/slack-stats) for your Slack team
 
3. Setup the desired analysis environment and load the Slack statistics

 	* [IBM Graph](https://github.com/ibm-cds-labs/slack-analytics/tree/master/slack-graph-database)
 	 
4. Explore the sample applications
 
  * [Query user and channel activity in Slack](https://github.com/ibm-cds-labs/slack-analytics-about-service) 

