// TODO: replace service2 with Youtube API call

angular.module('app')
  .factory('serviceAlt', serviceAlt);

angular.module('app')
  .factory('serviceAlt2', serviceAlt);

/*serviceAlt*/
function serviceAlt($http, $rootScope, $log, $q, storageKey) {

  var TWITCH_SEARCH_URL = 'https://api.twitch.tv/kraken/search/streams?type=suggest&live=true&q=';
  var TWITCH_STREAM_URL = 'https://api.twitch.tv/kraken/streams';
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
    'search': search,
    'error': _error
  };

  function init() {
    _streamInfo.streams = [];
    //_streamInfo = angular.copy(_streamInfoInit);
  };

  function search(s) {
    var defer = $q.defer();

    $http.get(TWITCH_SEARCH_URL + s)
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
        defer.reject(error);
      });

    return defer.promise;
  };


  function load(s) {
    var defer = $q.defer();

    $http.get(TWITCH_STREAM_URL)
      .then(function parse(response) {
        $log.info('HTTP GET stream success');
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
        defer.reject(error);
      });

    return defer.promise;
  };

}
