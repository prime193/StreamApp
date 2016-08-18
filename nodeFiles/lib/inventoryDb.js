//PUTTS
//Simple PUT/GET Access to JSON database (currently Mongo)
//Author: Anson Chan (trango812@gmail.com)

//Database client checked by interval, users will reuse single utility login

//To reproduce functionality on your box, install Mongo on your Node instance and 
//recreate the data structures as per the shell output below
//i.e. copy and paste the find output into the appropriate collection insert statement

/*
Ansons-MBP-2:~ achan$ mongo admin -u dbadmin -p test
MongoDB shell version: 3.2.1
connecting to: admin
Server has startup warnings: 
2016-08-13T21:23:18.503-0400 I CONTROL  [initandlisten] 
2016-08-13T21:23:18.503-0400 I CONTROL  [initandlisten] ** WARNING: soft rlimits too low. Number of files is 256, should be at least 1000
> use test
switched to db test
> show databases
admin  0.000GB
local  0.000GB
test   0.000GB
> show collections
Games
Inventory
SiteData
SiteUsers
> col = db.getCollection('SiteData')
test.SiteData
> col2 = db.getCollection('SiteUsers')
test.SiteUsers
> col.find()
{ "_id" : ObjectId("57aee29bf17fe3ecf580e590"), "user" : "trango812@gmail.com", "pwd" : "test", "app_id" : 1, "prefs" : { "bg_url" : "http://some.pic", "searchedFor" : [ "Freddy", "Starcraft" ] } }
> col2.find()
{ "_id" : ObjectId("57aee2d8f17fe3ecf580e591"), "user" : "trango812@gmail.com", "pwd" : "test", "app_id" : 1 }
> 
*/

/*
login				// login using username and password
get(dataset,query)	// retrieves matching doc with query from dataset
put(dataset,query,doc)  //updates dataset with doc for matching query, inserts if doc does not already exist
logout				// logout and deactivate session id
*/

// Loosely wire back end, use mongoDb for now
var DbClient = require('mongodb').MongoClient;
var DbProtocol = 'mongodb://';
var DbHost = 'localhost';
var DbPort = '27017';
var DbDatabase = 'test';
var DbLogin = {username: 'dbadmin',pwd: 'test'};
var DbLoginFn = DbClient.connect;
var DbGetFn = "collection";
var DBDefaultObject = 'Dogfood';

var _sessions = {};
var debug = true;


//Http  require('http');
//TODO: implement res-ponse writes
var Http = (function() {
	
	resOut = function(res,out){

		console.log(out.data,out.session);

		// res.writeHeader(headerInfo);
		// res.write(out);
		// res.end();
	}

	return {resOut : resOut};
})();


//Utility fns
var Util = (function() {

	//Thanks to stackexchange for this nugget
	createGUID = function() {
	    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
	        return v.toString(16);
	    });
	};

	return {createGUID : createGUID};
})();

function _od(o) {
	if (debug) {
		console.log(o);
	}
}


//Idb API
var Idb = (function() {

	_findSessionByUsername = function(username) {
		var result;
		for (var session in _sessions) {
					if (_sessions.hasOwnProperty(session)) {
						if (_sessions[session].user === username) {
							result = session;
							break;
						}
					}
				}
		return result;
	}

	_recycleDb = function() {

		var currentSession;
		currentSession = _findSessionByUsername(DbLogin.username);

			if (currentSession) {
				_od('Verifying current db connection...');
				var db = _sessions[currentSession].db;
				_openDataset(db,DBDefaultObject)
					.then(function(result) {
						_od('Database connection ok.');
						return true;
					})
					.catch(function(error) {
							_od('Current connection is invalid: ',error);
							_sessions.delete(currentSession);

							_od('Creating new database connection...');
							_login(DbLogin.username,DbLogin.pwd)
							.then(function(db){
								return _openDataset(db,DBDefaultObject);
							})
							.then(function(result){
								_od('Database connection ok.');
								return true;
							})
							.catch(function(error){
								_od('Unable to connect to database: ',error);
								return false;
							})
					})
			} else {
					_od('Connecting to database...');
					_login(DbLogin.username,DbLogin.pwd)
					.then(function(db){
						return _openDataset(db,DBDefaultObject);
					})
					.then(function(result){
						_od('Database connection ok.');
						return true;	//session
					})
					.catch(function(error){
						_od('Unable to connect to database: ',error);
						return false;
					})
			}

	}


	_getSession = function() {

		return new Promise(function(resolve,reject) {
			var currentSession;
			currentSession = _findSessionByUsername(DbLogin.username);
			
			// console.log('CurrentSession:',currentSession);

			if (currentSession) {
				resolve(currentSession);
			} else {
				reject('Database offline, please try again in a few minutes.');
			}
		});
	}


	_login = function(user,password,debugObj) {

								// _od('Connecting to db...');
		return new Promise(function(resolve,reject) {
				DbLoginFn.call(this, DbProtocol + user + ":" + password + "@" + DbHost + ":" + DbPort + "/",function(err,db) {
				if (!err) {
					var session = Util.createGUID();
					var setDb = db.db(DbDatabase);

					_sessions[session] = {user : user, db : setDb};
								out =  {success : 1, data : {message : 'Logged in as ' + user}, session : session};
								_od(out);
					resolve(setDb);
					
				} else {
						out = { success : 0, data : {message:err}, session: null};
						_od(out);
						if (debugObj) {
							debugObj.value = out;
						}
						reject(err);	
				}
			});
					});

	}

	_openDataset = function(db,dbObject) {
		return new Promise(function(resolve,reject) {
			if (!dbObject) dbObject = DBDefaultObject;
			db[DbGetFn](dbObject,function(err,dataset) {
				if (err) reject(err);
				if (!err) resolve(dataset);
			})
		});
	}


	_putDataset = function(dataset, query, doc, options) {
		return new Promise(function(resolve,reject) {
			dataset.update(query , {$set : doc}, options, function (err,result) {
				_od(err,result);
				if (err) reject(err);
				if (!err) resolve(result);
			})
		});
	}

	_getDataset = function(dataset, query, returnOne) {
		return new Promise(function(resolve,reject) {

			if (!returnOne) {
				dataset.find(query,function(err,items) {
					if (err) reject(err);
					if (!err) {
						items.toArray(function(err,itemArr){
							if (err) reject(err);
							if (!err) resolve(itemArr);
							})
						}
				});
			} else {
				dataset.findOne(query,function(err,item) {
					if (err) reject(err);
					if (!err) {resolve(item)};
				});
			}
		});
	}


	put = function(dataset,query,doc) {
		return new Promise(function(resolve,reject){
			var out = {success : 0, data: null, session: null};
			if (dataset && query && doc) {
				_getSession().then(function(session){
					var db = _sessions[session].db;
					_openDataset(db,dataset).then(function(cursor) {
						var options = {upsert : true, w:1,multi:false};
						return _putDataset(cursor,query,doc,options);
					})
					.then(function(result){
						out = { success : 1, data : result, session: session }; 
						_od(out);
						resolve(out);
					})
					.catch(function(err) {
						out = { success : 0, data : err, session: session }; 
						_od(out);
						reject(out);
					})
				})
				.catch(function(err){
					out = { success : 0, data : err, session: session }; 
					_od(out);
					reject(out);
				})
			} else reject(out);
		});		
	}


	get = function(dataset,query) {
		return new Promise(function(resolve,reject){
			var out = {success : 0, data: null, session: null};
			if (dataset) {
				if (query === undefined) query = {};
				_getSession().then(function(session){
					var db = _sessions[session].db;
					_openDataset(db,dataset).then(function(cursor) {
						var returnOne = true;
						return _getDataset(cursor,query,returnOne);
					})
					.then(function(result){
						out = { success : 1, data : result, session: session }; 
						_od(out);
						resolve(out);
					})
					.catch(function(err) {
						out = { success : 0, data : err, session: session }; 
						_od(out);
						reject(out);
					})
				})
				.catch(function(err){
					out = { success : 0, data : err, session: session }; 
					_od(out);
					reject(out);
				})
			} else reject(out);
		});
	}

	_logout = function () {
		
		var session = _findSessionByUsername(DbLogin.username);

		if (session) {
			var db = _sessions[session].db;
			try {
				db.close();
				delete _sessions[session];
				out = { success : 1, data : {message : 'Connection closed.'}, session: session }; 
				return out;
			}
			catch (ex) {
				out = { success : 0, data : {message : ex}, session: session }; 
				return out;
			}

		} else {
			out = { success : 0, data : {message : 'Primary database user not logged in.'}, session: null }; 
			return out;
		}
	}

	//API to global namespace
	return {login : _login,
			get : get,
			put : put,
			logout : _logout,
			recycleDb : _recycleDb
		};
})();



module.exports = Idb;





