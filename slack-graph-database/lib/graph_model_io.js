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

const fs = require('fs');
const path = require('path');
const async = require('async');
const debug = require('debug')('graph_model_io');

const SGM = require('./slack_graph_model.js');

// -----------------------------------------------------------------------------------
// Constructor
// -----------------------------------------------------------------------------------
	/**
	  * This class provides simple IO functionality for in-memory graph models.
	  * @param {Object} gm - in memory graph model
	  */
	function GraphModelIO(gm) {

		this.model = gm;

	} // constructor

// -----------------------------------------------------------------------------------
// 
// -----------------------------------------------------------------------------------

	/**
	  * Creates gremlin scripts for the associated graph model and saves them in destinationPath.
	  * @param {path} destinationPath - existing directory in which the gremlin scripts will be saved; defaults to current directory if not specified
	  * @param {callback} done - invoked after gremlin scripts have been saved to disk. done(error) is called if an issue was encountered  
	  */
	GraphModelIO.prototype.saveGremlinScripts = function(destinationPath, done) {

		if(! this.model) {
			return done('No Graph model is defined.'); // nothing to do
		}

		if(! done) {
			done = destinationPath;
			destinationPath = path.join('.', path.sep);
		}

		var fileName = null;
		var fileCounter = 1;

		// save each batch in a separate file
		async.each(this.model.generateGremlinDDLBatches(), 
			       function (gremlinBatch, callback) {

						fileName = path.join(destinationPath, this.model.getModelName() + '_' + fileCounter + '.gremlin');
				        fileCounter++;

						debug('Saving gremlin script ' + fileName);

				        fs.writeFile(fileName, 
				        	         JSON.stringify({'gremlin': gremlinBatch.ddl , 'bindings': gremlinBatch.ddlBindings}), 
				        			 function (error) {
								        return callback(error);
				    				 });
				   }.bind(this), 
				   function(error) {	// async.each callback

				   		if(error) {
				   			debug('Error saving gremlin scripts: ' + error);
				   		}

				   		return done(error);

				   });
	}; // saveGremlinScripts

	/**
	  * Save in-memory graph model in Graph DB
	  * @param {callback} done - invoked after the model has been saved to the Graph database
	  */
	GraphModelIO.prototype.saveModelInGraphDB = function(gdsWrapper, done) {

		if(! this.model) {
			return done('No Graph model is defined.'); // nothing to do
		}

		if(! gdsWrapper) {
			return done('A Graph DB wrapper instance must be provided.'); // nothing to do
		}

		// make sure a session is established
		if(! gdsWrapper.config.session) {
			gdsWrapper.session(function (error, token){
								gdsWrapper.config.session = token;
							  });
		}

		const maxVertexWorkers = 5,
			  maxEdgeWorkers = 5;

		console.log('Creating gremlin scripts.');

		var gremlinBatches = this.model.generateGremlinDDLBatches();
		var verticesBatches = [];
		var edgesBatches = [];
		var currentBatch = 1;


		for(var count = 0; count < gremlinBatches.length; count++) {
			if(gremlinBatches[count].graphBuildStage === 1) {
				verticesBatches.push(gremlinBatches[count]);
			}
			else {
				edgesBatches.push(gremlinBatches[count]);	
			}
		}

		console.log('Processing list: ' + verticesBatches.length + ' vertex definition scripts, ' + edgesBatches.length + ' edge definition scripts.');

		// create vertices
		async.eachLimit(verticesBatches, 
			            maxVertexWorkers,
			            function (gremlinBatch, callback) {

			             	debug('Processing vertices batch ' + currentBatch + ' of ' + verticesBatches.length + '. Approximate payload size: ' + gremlinBatch.size);
			             	currentBatch++;

							gdsWrapper.gremlin({gremlin: gremlinBatch.ddl, bindings: gremlinBatch.ddlBindings},
											   function(error, response){
												  	if(error) {
												  	   console.error('Gremlin vertices batch processing returned error: ' + JSON.stringify(error) + ' response code: ' + response.code + ' message => ' + response.message);
												  	   // FFDC: save DDL and bindings to local disk
														fs.writeFile('load_vertices' + new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-') + '.dump', 
													                 '# -------------------- Graph DB error  --------------------\n' + 
													                 JSON.stringify(error) + '\n' + 
													                 '# -------------------- Graph DB response  --------------------\n' + 
													                 JSON.stringify(response) + '\n' + 
													                 '# -------------------- gremlin   --------------------\n' + 
													                 gremlinBatch.ddl + 
													                 '# -------------------- bindings  --------------------\n' + 
													                 JSON.stringify(gremlinBatch.ddlBindings), 
																	 function (dumpError) {
																	 	console.error('FFDC dump operation completed: ' + (dumpError || 'no errors'));
																        return callback(error);
																	 });	
												  	}
												  	else {
												  		// TODO
												  		console.log('Gremlin vertices batch was processed successfully.');
												  		return callback();
												  	}	
											   }.bind(this));
				   }.bind(this), 
				   function(error) {	// async.eachLimit callback
				   		if(error) {
				   			debug('Error executing gremlin scripts to create edges: ' + error);
				   			return done(error);
				   		}

				   		currentBatch = 1;

				   		// create edges	
						async.eachLimit(edgesBatches, 
							            maxEdgeWorkers,
								   function (gremlinBatch, callback) {

			             				debug('Procesing edges batch ' + currentBatch + ' of ' + edgesBatches.length + '. Approximate payload size: ' + gremlinBatch.size);
								       	currentBatch++;

										gdsWrapper.gremlin({gremlin: gremlinBatch.ddl, bindings: gremlinBatch.ddlBindings},
														   function(error, response){
																  	if(error) {
																	  	   console.error('Gremlin edges batch processing returned error: ' + JSON.stringify(error) + ' response code: ' + response.code + ' message => ' + response.message);
																	  	   // FFDC: save DDL and bindings to local disk
																	       fs.writeFile('load_vertices' + new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-') + '.dump', 
																		                 '# -------------------- Graph DB error  --------------------\n' + 
																		                 JSON.stringify(error) + '\n' + 
																		                 '# -------------------- Graph DB response  --------------------\n' + 
																		                 JSON.stringify(response) + '\n' + 
																		                 '# -------------------- gremlin   --------------------\n' + 
																		                 gremlinBatch.ddl + 
																		                 '# -------------------- bindings  --------------------\n' + 
																		                 JSON.stringify(gremlinBatch.ddlBindings), 
																						 function (dumpError) {
																						 	console.error('FFDC dump operation completed: ' + (dumpError || 'no errors'));
																					        return callback(error);
																						 });	
																	  	}
																	  	else {
																	  		// TODO
																	  		console.log('Gremlin edges batch was processed successfully.');
																	  		return callback();
																	  	}	
																   }.bind(this));
								   }.bind(this), 
								   function(error) {	// async.eachSeries callback
								   	if(error) {
								   		debug('Error executing gremlin scripts to create edges: ' + error);
								   		return done(error);
								   	}

									return done(error);
								   }
						); // eachLimit
				   }); // eachLimit

	}; // saveModelInGraphDB

	/**
	  * Save in-memory graph model in local file
	  * @param {path} destinationPath - existing directory in which the model file will be saved; defaults to current directory if not specified
	  * @param {callback} done - invoked after the model has been saved to disk. done(error) is called if an issue was encountered; done(null, <file name>) otherwise
	  */
	GraphModelIO.prototype.saveModelInFile = function(destinationPath, done) {

		if(! this.model) {
			return done('No Graph model is defined.'); // nothing to do
		}

		if(! done) {
			done = destinationPath;
			destinationPath = path.join('.', path.sep);
		}

		// generate file name for serialized model file
		var fileName = path.join(destinationPath, this.model.getModelName() + '.sgm');

		debug('Saving Graph model ' + this.model.getModelName() + ' in file ' + fileName);

		// save file to local disk
        fs.writeFile(fileName, 
	                 this.model.exportGraphToJSON(), 
					 function (error) {
					 	debug('Modle file save operation completed: ' + (error || 'no errors'));
				        return done(error, fileName);
					 });		

	}; // saveModelInFile


	/* ------------------------------------------------------------------------------------------------
	 *
	 * static method(s)
	 *
	 * ------------------------------------------------------------------------------------------------
	 */

	/**
	  * Loads an existing in-memory graph model from a local file
	  * @param {path} sourceModelFile - identifies the in-memory graph model file
	  * @param {callback} done - invoked after the model has been loaded from disk. done(error) is called if an issue was encountered
	  * @return {Object} graphModel
	  */
	var loadModelfromFile = function(graphModelFile, done) {

		if(! graphModelFile) {
			return done('No graph model input file was specified.'); // nothing to do
		}

		debug('Trying to load Graph model from file ' + graphModelFile);

		// read file from local disk
        fs.readFile(graphModelFile, 
	                'utf8', 
					 function (error, gmJSON) {

						debug('File load operation completed: ' + (error || 'no errors'));

					 	if(error) {
					 		return done(error);	
					 	}
					 	else {

					 		try {
								  SGM.importGraphfromJSON(JSON.parse(gmJSON),
								  	                      function(error, sgm) {
								  	                      	debug('Import graph operation completed: ' + (error || 'no errors'));		
								  	                      	return done (error, sgm);
								  	                      });
					 		}
					 		catch(error) {
								return done(error);
					 		}
					 	}
					 });		

	}; // loadModelfromFile

module.exports.GraphModelIO = GraphModelIO;				// class
module.exports.loadModelfromFile = loadModelfromFile;	// static method	

