/*
TextAdventure a.k.a. 'Advent'
An interactive text adventure game engine, inspired by the irreverent text adventure classics Zork, Planetfall
and Hitchhiker's Guide to the Galaxy (imho, best sci-fi outside of Asimov's Robot series)

Node.js application | From the shell prompt: node textAdvent.js
Dependencies: advent_locations.json, advent_item_list.json, advent_action_list.json (3 files) in same folder as this app

// Version History:
// 1.0.0		A.CHAN	Initial release to the wild, basic inventory management and directives
// 			

*/

// set to true to enable _od function, otherwise suppressed
var _DEBUG = false;

// MECC: Modules, enums, constants, config
var $fs = require('fs');
var $readline = require('readline');

var _WELCOME_MSG = 'Advent 1.0.0';
var _ACTIONPATH = 'advent_action_list.json';
var _LOCATIONPATH = 'advent_locations.json';
var _ITEMPATH = 'advent_item_list.json';

var _HUNGER = {
	RAVENOUS : 'Ravenous'
	,SLUGGISH : 'Sluggish'
	,PECKISH : 'Peckish'
	,FULL : 'Full'
	,WELLFED :'Well Fed'
};

var _LIGHT = {
	PITCHBLACK : 'pitch black'
	,DARK : 'dark'
	,SHADY : 'shady'
	,LIGHT : 'light'
	,BRIGHT : 'bright'
};

var _DIRECTION = {
	NORTH : 'NORTH',
	EAST : 'EAST',
	SOUTH : 'SOUTH',
	WEST : 'WEST'
};


//State variables
var GameState = {
	time : "0000",
	locations : []
};

var Parser = {};
var Item = {};
var Modifier = {};

var PlayerState = {
	name : 'Player1',
	location : null,
	inventory : {},
	hunger : _HUNGER.FULL,
};


//IHelp: Item Helper API

var IHelp = (function () {

	var itemOwned = function _itemOwned(item) {
		return (item && typeof(item)==='string' && PlayerState.inventory[item])
	},

	itemAvailable = function _itemAvailable(item) {
		return (item && typeof(item)==='string'
			&& Item[item].CANGET
			&& GameState.locations[PlayerState.location].items.indexOf(item) != -1)
	},

	itemExists = function _itemExists(item) {
		return (item && typeof(item)==='string'
			&& GameState.locations[PlayerState.location].items.indexOf(item) != -1)
	},


	itemAdd = function _itemAdd(item) {
		var i = GameState.locations[PlayerState.location].items.indexOf(item);
		GameState.locations[PlayerState.location].items.splice(i,1);
		PlayerState.inventory[item] = 1;		//TODO 1.0.0: consider implementing stacking
	},

	itemDrop = function _itemDrop(item) {

		delete PlayerState.inventory[item];
		GameState.locations[PlayerState.location].items.push(item);
	},

	itemToggleFork = function _itemToggleFork(item, toggler) {

		if (item && Item[item].TOGGLEOTHER &&  Item[item].TOGGLEOTHER != null) {
			var otherItem = Item[item].TOGGLEOTHER;

			if (Modifier.ON && Modifier.ON == otherItem && (itemExists(otherItem) || itemOwned(otherItem))) {		
				return itemStateToggle(otherItem);
			} else { return 'You need to use that ON the right item, which must be owned or in view.' }
		}
			else return itemStateToggle(item);
	},

	itemStateToggle = function _itemStateToggle(item) {
		if (item && Item[item].CANTOGGLE) {
			
			var newstate = Item[item].STATE;
			switch (Item[item].STATE) {
				case "lit":
					newstate = "unlit";
					break;
				case "unlit":
					newstate = "lit";
					break;
				case "locked":
					newstate = "unlocked";
					break;
				case "unlocked":
					newstate = "locked";
					break;
				case "on":
					newstate = "off";
					break;
				case "off":
					newstate = "on";
					break;
				default:
			}
			Item[item].STATE = newstate;

			return 'The ' + item.toLowerCase() + ' is ' + newstate + '.';
		} else {return 'You can\'t use that item.'}
	},


	showInventory = function() {
		if (Object.keys(PlayerState.inventory).length == 0) {
			_o('There are no items in your inventory.');
			return;
		} 
		_o('You now have: ');
		for (var i in PlayerState.inventory) {
			_o(i.toString().toLowerCase());
		}
	},

	showItemsAvailable = function() {

	if (GameState.locations[PlayerState.location].items.length) {
			var msg = 'You see a: ';
			GameState.locations[PlayerState.location].items.forEach(function (item,pos) {
				// if (Item[item].CANGET) {
					msg += item.toLowerCase() + ', ';
				//}
			});
			_o(msg.substring(0,msg.length-2));
		}
	};

	//export into global namespace
	return { itemOwned : itemOwned
		,itemAvailable : itemAvailable
		,itemExists : itemExists
		,itemAdd : itemAdd
		,itemDrop : itemDrop
		,itemToggleFork : itemToggleFork
		,showInventory : showInventory
		,showItemsAvailable : showItemsAvailable
	};
})();


//Read in JSON files to parser, locations and items
function initGame(callback) {

	console.log(_WELCOME_MSG,'\n');
	console.log('Initializing game...');
	if (_DEBUG) {
		console.log('Debugging is ON');
	}
	console.log();

	var success = true;
	PlayerState.location = 0;
	PlayerState.inventory = {};
	PlayerState.hunger = _HUNGER.FULL;
	GameState.time = '1200';
	GameState.locations = [];

    $fs.readFile(_ACTIONPATH,'utf-8', function (err, data) {
        if (err) {
            _od(err.message);
            success = false;
        } else {
        	_od(data);
	        var o = JSON.parse(data);
	        _od(o);

	        for (var key in o) {				//read actions
	        	if (o.hasOwnProperty(key)) {
	        		if (!Parser[key]) {
	        			Parser[key] = o[key];
	        		}

	        		// Moved item and actionable verbs to Item Object

	        		// for (var i in o[key]) {		//unpack targets from array
	        		// 	var target = o[key][i];
	        		// 	var targetkey = Object.keys(target)[0];

	        		// 	if (targetkey == '_self') {
	        		// 		Parser[key] = target[targetkey];
	        		// 	} else if (!Parser[key][targetkey])
	        		// 		Parser[key][targetkey] = target[targetkey];
	        		// }
	        	}
	        }
        }
        
        if (success) {
	  		$fs.readFile(_ITEMPATH,'utf-8', function (err, data) {
	  			if (err) {
		            _od(err.message);
		            success = false;
	        	} else {
					Item = JSON.parse(data);	        								
					_od(Item);
	        	}
				if (success) {
					  		$fs.readFile(_LOCATIONPATH,'utf-8', function (err, data) {
					  			if (err) {
						            _od(err.message);
						            success = false;
					        	} else {
					        		GameState.locations = JSON.parse(data).locations;
					        		GameState.locations.forEach(function(item,pos) {
					        			item.visited = false;
					        		});
					        		_od(GameState.locations);
					        	}
					        	callback.call(this,success);   
					  		})
				}
	  		})
  		}  		
    });   
};


function _h() {
	_o('Command options are:');
	for (var i in Parser) {
		_o(i);
	}
};

function _m(direction) {

	//incoming move parsed and valid
	var _direction = direction.toLowerCase();
	
	var currentLocation = GameState.locations[PlayerState.location];
	_od(currentLocation);

	if (currentLocation[_direction] != null) {
			if (_direction == 'entry' && currentLocation.entryblock && Item[currentLocation.entryblock].STATE == 'locked') {
				_o('You need to do something before you can enter.');
				return;
			} 
			PlayerState.location = currentLocation[_direction];
	} else {
		if (_direction == 'entry' || _direction == 'exit') {
			_o('There is no entrance or exit here.');
		} else 	_o('You can\'t go ' + _direction + ' from here.');
		return;
	}
};

function _l(item,desc) {
	if (!item && !desc) {
		_o(GameState.locations[PlayerState.location].long_description);
	} else if (item && (IHelp.itemExists(item) || IHelp.itemOwned(item)) && desc) {
		if (Item[item].CANTOGGLE) {
			_o(desc + Item[item].STATE + '.');
		} else _o(desc);
	} else _o('You don\'t see that item here.');
};

function _u(target) {
	if (IHelp.itemAvailable(target) || IHelp.itemOwned(target)) {
		var stateDesc = IHelp.itemToggleFork(target);
		_o(stateDesc);
	} else {
		_o('That item is not available for use.');
	}
};


function _i(action,target,callback) {
	
	var success = true;
	if (action == "add") {
		if (IHelp.itemAvailable(target)) {
			IHelp.itemAdd(target);
		} else {
			_o('You can\'t add that to your inventory.'); success = false;
		}
	} else if (action == "drop") {
		if (IHelp.itemOwned(target)) {
			IHelp.itemDrop(target);
		} else {
			_o('You don\'t have that in your inventory.'); success = false;
		}
	} else if (action == "inventory") {
		IHelp.showInventory();
	}

	if (success && callback) {
		eval(callback);			//TODO 1.0.0: EVAL not optimal, is their another way?
	}
};


function _od(msg) {
	if (_DEBUG) {
		console.log(msg);
	}
};


function _d(action,callback) {
	if (action == "jump") {
		if (callback) {
			eval(callback);
		}
	}

};

function _o(msg) {
	console.log(msg)
};


function main() {

	initGame(engineStart);

};


//Game loop
function engineStart(result) {
	if (result) {

		var desc, currentLocation;
		var input = $readline.createInterface(process.stdin, process.stdout);
		input.setPrompt('> ');

		currentLocation = GameState.locations[PlayerState.location];
		console.log(currentLocation.caption);
		console.log(currentLocation.long_description);
		IHelp.showItemsAvailable();
	    currentLocation.visited = true;
		input.prompt();

		input.on('line', function(line) {
		    if (line.toUpperCase() === "QUIT") input.close();
		    
		    var action = parse(line);		//parse command
		    if (!action) console.log('I don\'t follow.  Type HELP for a list of commands.');

		    if (action) eval(action);		//update states etc.
		    
		    currentLocation = GameState.locations[PlayerState.location];		//output updated desc, etc.
		    console.log();
		    console.log(currentLocation.caption);
			desc = currentLocation.visited ? '' : currentLocation.long_description;
			if (desc != '') console.log(desc);
			IHelp.showItemsAvailable();
			currentLocation.visited = true;

		    //prompt again
		    input.prompt();

		}).on('close',function(){
			process.exit(0);
		});
	}
};


//Parse command line for tokens and return equivalent command with modifier
	//TODO 1.0.0: consider if localization has verb at end
	//TODO 1.0.0: implement lookup for synonyms
function parse(line) {
	
	if  (!(line && typeof(line) == "string" && line.length)) {
		return null;
	}

	var tokens = line.trim().toUpperCase().split(' ');

	if (tokens.length) {
		//directive check first item
		var cmd = Parser[tokens[0].toUpperCase()];
		if (cmd && cmd.length !=0) {  //exact match
			if (!(tokens[0] == 'LOOK' && tokens.length != 1)) {
				return cmd;				
			}
		}

		//verb-object check
		var verb = null, objet = null;								//french spelling of object, why not?					
		Modifier = {};

		for (var i in tokens) {
																	_od('Parsing: ' + tokens[i]);
			if (!verb && Parser.hasOwnProperty(tokens[i])) {
				verb = tokens[i];
																	_od('Found verb: ' + verb);
				continue;
			}

			if (verb && !objet && Item.hasOwnProperty(tokens[i])) {
				if (Item[tokens[i]][verb])  {
					objet = tokens[i];
					continue;												_od('Found object ' + objet);
				}
			} 

			if (verb && objet && tokens[i]=='ON') {					_od('Found ON: ');
				Modifier.ON = null;
				continue;
			}

			if (verb && objet && Modifier.hasOwnProperty('ON') && Item.hasOwnProperty(tokens[i])) {		_od('Found ON object: ' + tokens[i]);
				Modifier.ON = tokens[i];
				continue;
			}
			
			//otherwise ignore token
		}
		if (verb && objet) {
			return Item[objet][verb];
		}
	}
	// either no tokens or no matches
	return null;
}

//invoke
main();







