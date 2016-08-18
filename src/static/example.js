// note: controller returned values must be encapsulated in objects
// $rootScope.$watch doesn't appear to work in factory, moved $watch to $scope in controller

angular.module('app', ['ngAnimate', 'ui.bootstrap','ngCookies']);

angular.module('app')
  .constant('LOCALE', 'en-us')
  .constant('storageKey', 'myApp')
  .constant('TWITCH_API',0)
  .constant('TWITCH_SEARCH',1)
  .constant('YOUTUBE_API',2)

angular.module('app')
  .controller('MainController', function(FormDataService, serviceAlt, serviceAlt2, $q, $log, $interval, $timeout, $scope, $rootScope, $window, LOCALE, TWITCH_API, TWITCH_SEARCH, YOUTUBE_API) {


    $rootScope.backgroundUrl = 'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/First_flight3.jpg&width=1024';

    var _intervals = [];
    var _itemSelected = '';
    var _serviceSelected = TWITCH_API;
    var _serviceOptions = [{id : TWITCH_API, name: 'Twitch Top 10'}, {id : TWITCH_SEARCH, name: 'Search Twitch'}];
    var _error = '';
    
    var _showHide = {
      loading: true,
      error: false,
      content: false
    };

    function test() {
      
      alert('here');  
    }
    
    function init() {
      $log.info('mainController init() entry');
      //does not work
      // var el = angular.element(document.querySelector('#optradio'));
      // el.value = TWITCH_API;
      
      _intervals.forEach(function(item, position, array) {
        $interval.cancel(item);
      });
      _intervals.push($interval(getLeaderBoard, 30000));
      componentHideShow({
        loading: true,
        error: false,
        content: false
      });
      $timeout(getLeaderBoard, 0);
    }

    function getLeaderBoard() {

      var promiseResult = $q.reject();
      var arrPromise = [];
      
      if (_serviceSelected == TWITCH_API) {
        arrPromise = [serviceAlt.load('val1'),
          serviceAlt2.load('val2')];
      } else if (_serviceSelected == TWITCH_SEARCH && FormDataService.data.searchText != '') {
        arrPromise = [serviceAlt.search(FormDataService.data.searchText)];
      }
      
      if (arrPromise) {
        promiseResult = $q.all(arrPromise)
        .then(function(value) {
          $log.info('Values returned: ', value);
          componentHideShow({
            loading: false,
            error: false,
            content: true
          });
        })
        .catch(function(error) {
          $log.info(error);
          componentHideShow({
            loading: false,
            error: true,
            content: false
          });
          $q.reject('Fail');
        });
      }
      
    }

    function componentHideShow(vals) {
      _showHide.loading = vals.loading;
      _showHide.error = vals.error;
      _showHide.content = vals.content;
    }

    function serviceChanged(value) {
      $log.info('Service type changed to: ',value);
      _serviceSelected = value;
      $log.info('Reloading page...');
      init();
    }
  

    var vm = this;
  
    vm.test = function(value) {
      $log.info('Output value is:',value);
    }
  
    vm.formData = FormDataService.data;
    vm.streamData = FormDataService.streamData;
    vm.streamInfo = serviceAlt.streamInfo;
    vm.itemSelected = _itemSelected;
    vm.serviceSelected = _serviceSelected;
    vm.serviceOptions = _serviceOptions;
    vm.error = _error;

    vm.serviceChanged = function(value) {
      serviceChanged(value);
    };

    
    vm.showHide = _showHide;
    vm.resetData = function() {
      vm.formData = FormDataService.reset();
    };

    vm.selectChanged = function(item) {
      $log.info('Item Changed to:', item);
      $window.open(item, '_blank');
    };

    vm.reload = function() {
      init();
    };


    vm.checkUser = function () {
        FormDataService.login()
        .then(function(result){
            $log.info(result);
        })
        .catch(function(error) {
            _error = error;
            $log.info(error);
        })
    };    
     
  
  vm.editAccount = function () {
    alert('TODO: Edit account settings...');
  }
  
  vm.logout = function () {
    vm.formData = FormDataService.reset();
  }
  
  vm.addUser = function () {
    alert('TODO: Add new user');
  }
  
    switch (LOCALE) {
      case "en-us":
        var _localizationValues = {
          plays: 'plays'
        };
        break;
      default:
        var _localizationValues = {
          plays: 'is playing'
        };
    };
    vm.localizationValues = _localizationValues;

    init();

    $scope.$watch(function() {
      $log.info('watch entry()');
      return serviceAlt.streamInfo.updateCount;
    }, function(newValue, oldValue) {
      $log.info('Object changed.');
    });

    $scope.$watch(function() {
      return _showHide;
    }, function(newValue, oldValue) {
      $log.info('showHide changed.');
    });

    $scope.$watch(function() {
      return _serviceSelected;
    }, function(newValue, oldValue) {
      $log.info('serviceSelected changed.');
    });

 
    $scope.$watch(function() {
      $log.info('watching bg selection');
      return $scope.selected;
    }, function(newValue, oldValue) {
      $log.info('Object changed.');
    });
    
    return vm;
  });

angular.module('app')
  .factory('FormDataService', twitchApi);

angular.module('app')
  .factory('serviceAlt', serviceAlt);

angular.module('app')
  .factory('serviceAlt2', serviceAlt);

/*Twitch*/
function twitchApi($http, $rootScope, $log, $q, storageKey, $cookies) {

  var _init = {
    title: '',
    first_name: '',
    last_name: '',
    searchText: '',
    username : '',
    password : '',
    auth : false
  };

  var _streamDataInit = {
    streams: []
  };
  var _streamData = _streamDataInit;
  var _streamInfoInit = {
    streams: []
  };
  var _streamInfo = _streamInfoInit;

  var _store = {};
  _store = angular.copy(_init);
  auth();
  //Load any previous data from localStorage
  // if (localStorage['myApp'] != undefined) {
  //   //_store = angular.fromJson(localStorage['myApp']);
  // } else {
  //   _store = angular.copy(_init);
  // }
  
  var service = {
    'data': _store,
    'streamData': _streamData,
    'streamInfo': _streamInfo,
    'login' : login,
    'save': save,
    'reset': reset,
    'auth' : auth
  };


    function auth() {
    $log.info("Verifying auth cookie...");
    _store.username = $cookies.get('username');
    _store.auth = ($cookies.get('username')) ? true : false; 
    return _store.auth;
    }
    
    function login() {
        var defer = $q.defer();
        var data = {
                username: _store.username,
                password: _store.password
            };
        var headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            
        $http.post('/login',data,headers)
        .then(function parse(response){
            _store.auth = true;
            defer.resolve('Logged in');
        })
        .catch(function(response){
            if (response.status === 401 ) {
                $log.error('Authorization failed: ',response.data);    
            } else {
                $log.error('Other error: ',response);
            }
            defer.reject(response.data);
        });
        
        return defer.promise;
    }


  function save() {
    $log.info("Saving data to localStorage...");
    localStorage[storageKey] = angular.toJson(_store);
    //$log.info("Retrieving streamData...");
    //getLeaderBoard();
  }

  //   var _refreshLeader = setInterval(getLeaderBoard,15000);

  function reset() {
    $log.info("Resetting localStorage data...");
    localStorage[storageKey] = undefined;
    _store = angular.copy(_init);
    return _store;
  }

  $rootScope.$watchCollection(function() {
    return _store;
  }, function(newValue, oldValue) {
    save();
  });

  $rootScope.$watchCollection(function() {
    return _streamData;
  }, function(newValue, oldValue) {
    var x = newValue;
  });

  return service;
}

/*serviceAlt*/
function serviceAlt($http, $rootScope, $log, $q, storageKey) {

  var _streamInfoInit = {
    streams: [],
    updateCount: 0
  };
  var _streamInfo = angular.copy(_streamInfoInit);
  var _error = {
    message: ''
  };

  init();

  return {
    'streamInfo': _streamInfo,
    'load': load,
    'search' : search,
    'error': _error
  };

  function init() {
    //$log.info('init() entry.');
    _streamInfo.streams = [];
    //_streamInfo = angular.copy(_streamInfoInit);
  };

  //insert
    function search(s) {
    var defer = $q.defer();

    $http.get('https://api.twitch.tv/kraken/search/streams?type=suggest&live=true&q=' + s)
      .then(function parse(response) {
        $log.info('HTTP GET search success');
        init();
        response.data.streams.forEach(function(item, position, array) {
          newItem = {
            display_name: item.channel.display_name,
            game: item.channel.game,
            url: item.channel.url,
            preview: item.preview
          };
          _streamInfo.streams.push(newItem);
        });
        _streamInfo.updateCount++;
        $log.info('_streamInfo.streams length: ', _streamInfo.streams.length);
        $log.info('updateCount: ', _streamInfo.updateCount);
        defer.resolve(s);
      })
      .catch(function(error) {
        $log.info("Error occurred:", error);
        // _error.message = error;
        defer.reject(error);
      });

    return defer.promise;
  };

  //end-insert
  
  function load(s) {
    var defer = $q.defer();

    $http.get('https://api.twitch.tv/kraken/streams')
      .then(function parse(response) {
        $log.info('http alt service get success');
        init();
        response.data.streams.forEach(function(item, position, array) {
          newItem = {
            display_name: item.channel.display_name,
            game: item.channel.game,
            url: item.channel.url,
            preview: item.preview
          };
          _streamInfo.streams.push(newItem);
        });
        _streamInfo.updateCount++;
        $log.info('_streamInfo.streams length: ', _streamInfo.streams.length);
        $log.info('updateCount: ', _streamInfo.updateCount);
        defer.resolve(s);
      })
      .catch(function(error) {
        $log.info("Error occurred:", error);
        // _error.message = error;
        defer.reject(error);
      });

    return defer.promise;
  };

}

function streamController() {
  var ctrl = this;
  ctrl.data = {header : ctrl.stream.display_name, detail : ctrl.stream.game};
  
};

angular.module('app')
.component('stream',{
  bindings : {stream : '<'},
  template : '<label>{{$ctrl.stream.display_name}} - {{$ctrl.stream.game}}</label> <popdetails header={{$ctrl.data.header}} detail={{$ctrl.data.detail}}></popdetails> <a ng-href={{$ctrl.stream.url}} target="_blank"> <img ng-src={{$ctrl.stream.preview.large}}</img>            </a>',
  controller : streamController
}
           
)

function popDetailsController() {
  var ctrl = this;
}

angular.module('app')
.component('popdetails', {
  bindings : {header : '@',detail : '@'},
  template : '<button uib-popover="{{$ctrl.detail}}" popover-title="{{$ctrl.header}}" type="button" class="btn btn-info" popover-placement="top-right" popover-trigger="""click:outsideClick""">Info</button>',
  controller : popDetailsController
}
)


angular.module('app').controller('ModalDemoCtrl', function ($scope, $rootScope, $uibModal, $log) {

  $scope.items = ['http://wallpapercave.com/wp/MiUGm2d.jpg'
  , 'http://wallpapercave.com/wp/V9Y3XDN.jpg'
  , 'http://i.imgur.com/RAWrkWQ.jpg'
  , 'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/First_flight3.jpg&width=1024'
  ];
  
  
  $scope.open = function (size) {

    var modalInstance = $uibModal.open({
      animation: false,
      templateUrl: 'prefs.modal.html',
      controller: 'ModalInstanceCtrl',
      size: size,
      resolve: {
        items: function () {
          return $scope.items;
        }
      }
    });

    modalInstance.result.then(function (selectedItem) {
      $rootScope.backgroundUrl = selectedItem;
    }, function () {
      //NOP
    });
  };

  $scope.toggleAnimation = function () {
    $scope.animationsEnabled = !$scope.animationsEnabled;
  };

});


angular.module('app').controller('ModalInstanceCtrl', function ($scope, $uibModalInstance, items, $log) {

  $scope.items = items;
  
  $scope.myInterval = 0;
  $scope.noWrapSlides = false;
  $scope.active = 0;
  $scope.index = 0;
  $scope.animationsEnabled = true;
  
  $scope.slides = [];
  var currIndex = 0;

  $scope.addSlide = function(i) {
    $scope.slides.push({
      image: $scope.items[i],
      text:'Image #' + i,
      id: i
    });
  };

  $scope.items.forEach(function(item,position) {
      $scope.addSlide(position);
  });
  

  $scope.ok = function () {
    $uibModalInstance.close($scope.items[$scope.active]);
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});