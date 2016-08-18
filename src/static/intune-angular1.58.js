angular.module('app', ['ngAnimate', 'ui.bootstrap', 'ngCookies']);

angular.module('app')
  .factory('FormDataService', formsHandler);



function formsHandler($http, $rootScope, $log, $q, storageKey, $cookies) {

  var _init = {
    title: '',
    first_name: '',
    last_name: '',
    searchText: '',
    username: '',
    password: '',
    auth: false
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
    'login': login,
    'save': save,
    'reset': reset,
    'auth': auth
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

    $http.post('/login', data, headers)
      .then(function parse(response) {
        _store.auth = true;
        defer.resolve('Logged in');
      })
      .catch(function(response) {
        if (response.status === 401) {
          $log.error('Authorization failed: ', response.data);
        } else {
          $log.error('Other error: ', response);
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

function streamController() {
  var ctrl = this;
  ctrl.data = {
    header: ctrl.stream.display_name,
    detail: ctrl.stream.game
  };

};

angular.module('app')
  .component('stream', {
      bindings: {
        stream: '<'
      },
      template: '<label>{{$ctrl.stream.display_name}} - {{$ctrl.stream.game}}</label> <popdetails header={{$ctrl.data.header}} detail={{$ctrl.data.detail}}></popdetails> <a ng-href={{$ctrl.stream.url}} target="_blank"> <img ng-src={{$ctrl.stream.preview.large}}</img>            </a>',
      controller: streamController
    }

  )

function popDetailsController() {
  var ctrl = this;
}

angular.module('app')
  .component('popdetails', {
    bindings: {
      header: '@',
      detail: '@'
    },
    template: '<button uib-popover="{{$ctrl.detail}}" popover-title="{{$ctrl.header}}" type="button" class="btn btn-info" popover-placement="top-right" popover-trigger="""click:outsideClick""">Info</button>',
    controller: popDetailsController
  })


angular.module('app').controller('ModalDemoCtrl', function($scope, $rootScope, $uibModal, $log) {

  $scope.items = ['http://wallpapercave.com/wp/MiUGm2d.jpg', 'http://wallpapercave.com/wp/V9Y3XDN.jpg', 'http://wallpapercave.com/wp/S9Rssok.jpg', 'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/First_flight3.jpg&width=1024'];


  $scope.open = function(size) {

    var modalInstance = $uibModal.open({
      animation: false,
      templateUrl: 'comp-prefs-modal.html',
      controller: 'ModalInstanceCtrl',
      size: size,
      resolve: {
        items: function() {
          return $scope.items;
        }
      }
    });

    modalInstance.result.then(function(selectedItem) {
      $rootScope.backgroundUrl = selectedItem;
    }, function() {
      //NOP
    });
  };

  $scope.toggleAnimation = function() {
    $scope.animationsEnabled = !$scope.animationsEnabled;
  };

});


angular.module('app').controller('ModalInstanceCtrl', function($scope, $uibModalInstance, items, $log) {

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
      text: 'Image #' + i,
      id: i
    });
  };

  $scope.items.forEach(function(item, position) {
    $scope.addSlide(position);
  });


  $scope.ok = function() {
    $uibModalInstance.close($scope.items[$scope.active]);
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
});