
/*global angular, _*/


angular.module('talai', [])
.factory('jsonapi', function($http, $q) {
  var cache = false
  return function request(url) {
    var key = 'cached:' + url
    if (sessionStorage[key] && cache) {
      return $q.when(JSON.parse(sessionStorage[key]))
    }
    var promise = $http.get('http://jsonp.jit.su/?url=' + encodeURIComponent(url))
    return promise.then(function(result) {
      sessionStorage[key] = JSON.stringify(result.data)
      return result.data
    })
  }
})
.factory('cachebuster', function() {
  var prefix = Math.random() + ',' + new Date().getTime() + ','
  return function(cachebuster) {
    return prefix + Math.floor(new Date().getTime() / 60000)
  }
})
.factory('talai', function(jsonapi, cachebuster) {
  var talai = { }
  var base1 = String.fromCharCode(
    0x68,0x74,0x74,0x70,0x3a,0x2f,0x2f,0x6b,
    0x75,0x62,0x75,0x73,0x2e,0x6e,0x65,0x74,
    0x62,0x75,0x72,0x7a,0x74,0x2e,0x63,0x6f,
    0x6d,0x2f,0x61,0x70,0x70,0x61,0x70,0x69,
    0x2f,0x6d,0x6f,0x62,0x69,0x6c,0x65,0x53,
    0x65,0x72,0x76,0x69,0x63,0x65,0x2f,0x67,
    0x65,0x74,0x52,0x6f,0x75,0x74,0x65,0x41,
    0x6e,0x64,0x53,0x74,0x6f,0x70,0x2e,0x70,
    0x68,0x70)
  var base2 = String.fromCharCode(0x68,0x74,0x74,0x70,0x3a,0x2f,0x2f,0x6b,0x75,0x62,0x75,0x73,
    0x2e,0x6e,0x65,0x74,0x62,0x75,0x72,0x7a,0x74,0x2e,0x63,0x6f,
    0x6d,0x2f,0x6d,0x61,0x70,0x2f,0x67,0x65,0x74,0x42,0x75,0x73,
    0x53,0x74,0x61,0x74,0x75,0x73,0x44,0x61,0x74,0x61,0x3f,0x62,
    0x75,0x73,0x73,0x74,0x61,0x74,0x69,0x6f,0x6e,0x69,0x64,0x3d)
  talai.stops = jsonapi(base1 + '?cachebust=' + cachebuster())
  talai.status = function(id) {
    return jsonapi(base2 + id + '&cachebust=' + cachebuster())
  }
  return talai
})
.factory('geolocation', function($q) {
  return {
    get: function(options) {
      var defer = $q.defer()
      navigator.geolocation.getCurrentPosition(
        defer.resolve.bind(defer),
        defer.reject.bind(defer), options)
      return defer.promise
    }
  }
})
.controller('MainController', function($scope) {
  $scope.setError = function(message) {
    $scope.errorMessage = message
  }
  $scope.err = function(message) {
    return function() {
      $scope.setError(message)
    }
  }
})
.controller('TalaiController', function($scope, talai) {
  $scope.page = 'stop'
  $scope.setStop = function(stop) {
    $scope.page = 'list'
    $scope.currentStop = stop
  }
  $scope.$watch('currentStop.ID', function(id) {
    if (id) {
      $scope.load(id)
    }
  })
  $scope.load = function(id) {
    $scope.loading = true
    talai.status(id).then(function(buses) {
      $scope.buses = buses
      if ($scope.buses.length === 0) {
        $scope.setError('No bus found :(')
      }
    })
    .finally(function() {
      $scope.loading = false
    })
  }
  talai.stops.then(function(stops) {
    $scope.stops = stops
    $scope.allStops = _.map(stops.Stop, _.identity)
  }, $scope.err('Cannot get bus stops'))
})
.controller('StopController', function($scope, talai, geolocation) {
  $scope.stopPage = 'index'
  $scope.setStop = function(stop) {
    $scope.$parent.setStop(stop)
    $scope.stopPage = 'index'
  }
  $scope.detectLocation = function() {
    $scope.stopPage = 'detect'
    var options = { enableHighAccuracy: true, timeout: 7500, maximumAge: 60000 }
    geolocation.get(options).then(function(position) {
      var lat = position.coords.latitude, lng = position.coords.longitude
      var square = function(x) { return x * x }
      var distance = function(stop) { return square(stop.Latitude - lat) + square(stop.Longitude - lng) }
      return talai.stops.then(function(stops) {
        var best = _.min(stops.Stop, distance)
        $scope.setStop(best)
      }, $scope.err('Cannot get the bus stops!'))
    }, $scope.err('Cannot get the location!'))
  }
  $scope.selectLocation = function() {
    $scope.stopPage = 'select'
  }
})





