angular.module('app')
  .constant('DEFAULT_LOCALIZATION', 'en-us')
  .constant('DEFAULT_FLAG_URL','https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Flag_of_the_United_States_%28Pantone%29.svg/196px-Flag_of_the_United_States_%28Pantone%29.svg.png')
  .constant('storageKey', 'myApp')
  .constant('TWITCH_API', 0)
  .constant('TWITCH_SEARCH', 1)
  .constant('YOUTUBE_API', 2)
  .constant('PAGE_REFRESH_INTERVAL',30000)

angular.module('app')
  .controller('MainController', function(FormDataService, serviceAlt, serviceAlt2, $q, $log, $interval, $timeout, $scope, $rootScope, $window
  ,PAGE_REFRESH_INTERVAL,DEFAULT_LOCALIZATION, DEFAULT_FLAG_URL, TWITCH_API, TWITCH_SEARCH, YOUTUBE_API) {

    $rootScope.backgroundUrl = 'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/First_flight3.jpg&width=1024';

//declares
    var _intervals = [];
    var _itemSelected = '';
    var _serviceSelected = TWITCH_API;
    var _serviceOptions = [{
      id: TWITCH_API,
      name: 'Twitch Top 10'
    }, {
      id: TWITCH_SEARCH,
      name: 'Search Twitch'
    }];
    
    var _error = '';
    var _localizationValues = { locale : DEFAULT_LOCALIZATION, flag_url : DEFAULT_FLAG_URL };

//hide/show components
    var _showHide = {
      loading: true,
      error: false,
      content: false
    };


//init
    function init() {

      _intervals.forEach(function(item, position, array) {
        $interval.cancel(item);
      });
      _intervals.push($interval(getLeaderBoard, PAGE_REFRESH_INTERVAL));
      componentHideShow({
        loading: true,
        error: false,
        content: false
      });
      $timeout(getLeaderBoard, 0);
    }


// Get stream data and store in factory objects

    function getLeaderBoard() {

      var promiseResult = $q.reject();
      var arrPromise = [];

      if (_serviceSelected == TWITCH_API) {
        arrPromise = [serviceAlt.load('debugLoadService1'),
          serviceAlt2.load('debugLoadService2')
        ];
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
      $log.info('Service type changed to: ', value);
      _serviceSelected = value;
      $log.info('Reloading page...');
      init();
    }

// Maincontroller External

    var vm = this;          //vm = this is now the best practice for angular 1.xx

    vm.test = function(value) {
      $log.info('Output value is:', value);
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


    vm.checkUser = function() {
      FormDataService.login()
        .then(function(result) {
          $log.info(result);
        })
        .catch(function(error) {
          _error = error;
          $log.info(error);
        })
    };

    vm.editAccount = function() {
      alert('TODO: Edit account settings...');
    }

    vm.logout = function() {
      vm.formData = FormDataService.reset();
    }

    vm.addUser = function() {
      alert('TODO: Add new user');
    }

    // switch (LOCALE) {
    //   case "en-us":
    //     var _localizationValues = {
    //       plays: 'plays'
    //     };
    //     break;
    //   default:
    //     var _localizationValues = {
    //       plays: 'is playing'
    //     };
    // };
    
//TODO: Add localization preference to preference modal and code for data-localize tags
    vm.localizationValues = _localizationValues;

    init();


//watches
    $scope.$watch(function() {
      $log.info('watch entry()');
      return serviceAlt.streamInfo.updateCount;
    }, function(newValue, oldValue) {
      $log.info('Factory object updated.');
    });

    // $scope.$watch(function() {
    //   return _showHide;
    // }, function(newValue, oldValue) {
    //   $log.info('showHide changed.');
    // });

    $scope.$watch(function() {
      return _serviceSelected;
    }, function(newValue, oldValue) {
      $log.info('serviceSelected changed.');
    });

    // $scope.$watch(function() {
    //   $log.info('watching bg selection');
    //   return $scope.selected;
    // }, function(newValue, oldValue) {
    //   $log.info('Object changed.');
    // });

    return vm;
  });
