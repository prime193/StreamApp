//vanillaHTTP
//Generic Web Server with session authentication
//Cookie access required on inbound requests
//Utilizes PUT/GET access to JSON database

//Author: Anson Chan (trango812@gmail.com)

//TODO: upload this as an NPM-installable
//TODO: create script to poll new user request queue

//See require(s) below for installation (in lieu of package install)

var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var crypto = require('crypto');
var Idb = require('./lib/inventoryDb.js');
var app = express();
var _users = [];
init(app,8080);


function init(app,port) {

	Idb.recycleDb();
	var interval = setInterval(Idb.recycleDb,1000*60*5);

	app.use(bodyParser());
	app.use(cookieParser('MAGICUNICORN'));
	app.use(session());
	app.use('/tunedin',express.static('./static/'));
	app.listen(port);
}

function addUser(user) {
	_users.push(user);
}

function findUser(user) {
	_users.forEach(function(item,position,array){
		if (item === user) {
			return position;
		}
	})
	return null;
}

function deleteUser(user) {
	var position = findUser(user);
	if (position) {
		_users.splice(position,1);
	}
}

var db = (function() {

	return {getPassword : getPassword};

	function getPassword(user,callback) {

		Idb.get('SiteUsers',{user : user, app_id : 1})
		.then(function(result){
			var data = result.data;
			callback(data.pwd);
		})
		.catch(function(err){
			callback(null);
		})
	}
})();


app.get('/login',function(req,res) {
	res.redirect('/');
});

app.post('/db',function(req,res){
	console.log('Db request received.');
	var user = req.body.username;
	var bg_url = req.body.bg_url;
	var searchedFor = req.body.searchedFor;

	if (req.body.action === 'put' && findUser(user) && bg_url && searchedFor) {
		console.log('Put received from ',user);
		var doc = {"user" : user, app_id: 1, "prefs" : { "bg_url" : bg_url, "searchedFor" : searchedFor } }
		Idb.put('SiteData',{user : user},doc)
		.then(function(result){
			res.status(200);
	 		res.send('ok');
		})
		.catch(function(err){
			req.session.error = 'Unable to save data user preferences.';
			res.status(500);
			res.send(req.session.error);
		})
	} else {
		res.status(403);
		res.send('Forbidden');
	}
});

app.post('/login',function(req,res){
	console.log('Post login received');
	var user = req.body.username;
	var pwd = req.body.password;
	console.log('user: ',user, ' pwd: ', pwd);
	
	if (user && pwd) {
		db.getPassword(user,function(dbPwd) {
			if (pwd === dbPwd) {
				req.session.regenerate(function(){
					addUser(user);
					res.cookie('username',user,{maxAge : 24*60*60*1000,httpOnly:false,path:'/'});
			 		res.status(200);
			 		res.send('ok');
				});
			} else {
				req.session.regenerate(function(){
					req.session.error = 'Could not login with this username and password.';
					res.status(401);
					res.send(req.session.error);
				});	
			}
		})
	} else {
		req.session.error = 'Must supply both username and password.';
		res.status(401);
		res.send(req.session.error);
	}
});

app.get('/logout',function(req,res) {
	req.session.destroy(function(){
		res.clearCookie('username');
		res.redirect('/');
	});
});

app.get('/',function(req,res) {
	console.log("GET / received.\n");

	if (req.cookies.username) {
		addUser(req.cookies.username);
		//req.session.user = req.cookies.username;	
	}
    //console.log('User is: ',req.session.user);

    res.redirect('/tunedin');

});



