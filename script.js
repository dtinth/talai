
/*global angular, _*/

void function() {

var cache = false
var colors = { '1': 'danger', '2': 'primary', '3': 'success', '4': 'warning' }


angular.module('talai', [])
.factory('jsonapi', function($http, $q) {
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
    if (cache) return 'n'
    return prefix + Math.floor(new Date().getTime() / 60000)
  }
})
.factory('talai', function(jsonapi, cachebuster, $sce) {
  var talai = { }
  var base1 = String.fromCharCode(
    0x68,0x74,0x74,0x70,0x3a,0x2f,0x2f,0x6b,0x75,0x62,0x75,0x73,0x2e,0x6e,0x65,
    0x74,0x62,0x75,0x72,0x7a,0x74,0x2e,0x63,0x6f,0x6d,0x2f,0x61,0x70,0x70,0x61,
    0x70,0x69,0x2f,0x6d,0x6f,0x62,0x69,0x6c,0x65,0x53,0x65,0x72,0x76,0x69,0x63,
    0x65,0x2f,0x67,0x65,0x74,0x52,0x6f,0x75,0x74,0x65,0x41,0x6e,0x64,0x53,0x74,
    0x6f,0x70,0x2e,0x70,0x68,0x70)
  var base2 = String.fromCharCode(
    0x68,0x74,0x74,0x70,0x3a,0x2f,0x2f,0x6b,0x75,0x62,0x75,0x73,
    0x2e,0x6e,0x65,0x74,0x62,0x75,0x72,0x7a,0x74,0x2e,0x63,0x6f,
    0x6d,0x2f,0x6d,0x61,0x70,0x2f,0x67,0x65,0x74,0x42,0x75,0x73,
    0x53,0x74,0x61,0x74,0x75,0x73,0x44,0x61,0x74,0x61,0x3f,0x62,
    0x75,0x73,0x73,0x74,0x61,0x74,0x69,0x6f,0x6e,0x69,0x64,0x3d)
  talai.stops = jsonapi(base1 + '?cachebust=' + cachebuster())
  talai.status = function(id) {
    return jsonapi(base2 + id + '&cachebust=' + cachebuster())
      .then(function(buses) {
        var now = new Date()
        var re = /(\d+):(\d+):(\d+)/
        var t = function(x) { return x < 10 ? '0' + x : x }
        buses.forEach(function(bus) {
          var m = ('' + bus.estimatedtime).match(re)
          if (m) {
            var est = new Date(now.getTime() +
              parseInt(m[1], 10) * 1000 * 60 * 60 +
              parseInt(m[2], 10) * 1000 * 60 +
              parseInt(m[3], 10) * 1000)
            bus.estimatedArrival = est.getHours() + ':' + t(est.getMinutes())
          } else {
            bus.estimatedArrival = 'Unknown'
          }
        })
        return buses
      })
  }
  talai.lineClass = function(key) {
    return colors[key] || 'default'
  }
  talai.label = function(key) {
    var cls = talai.lineClass(key)
    return $sce.trustAsHtml('<span class="label label-' + cls + '">' + key + '</span>')
  }
  return talai
})
.factory('geolocation', function($q) {
  return {
    get: function(options) {
      var defer = $q.defer()
      try {
        navigator.geolocation.getCurrentPosition(
          defer.resolve.bind(defer),
          defer.reject.bind(defer), options)
        return defer.promise
      } catch (e) {
        return $q.reject(e)
      }
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
  $scope.lineLabel = function(bus) {
    return talai.label(bus.buslineid)
  }
  $scope.lineClass = function(bus) {
    return talai.lineClass(bus.buslineid)
  }
  $scope.load = function(id) {
    $scope.loading = true
    talai.status(id).then(function(buses) {
      $scope.buses = buses
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
.controller('StopController', function($scope, talai, geolocation, $sce) {
  $scope.passes = function(stop) {
    if (!$scope.stops) return
    var order = $scope.stops.StopOrder
    var pass = function(key) { return _.include(order[key], stop.ID) }
    var html = _($scope.stops.StopOrder).keys().filter(pass).map(talai.label)
    return $sce.trustAsHtml(html.join(' '))
  }
  $scope.detectLocation = function() {
    var options = { enableHighAccuracy: true, timeout: 7500, maximumAge: 60000 }
    $scope.nearby = null
    geolocation.get(options).then(function(position) {
      var lat = position.coords.latitude, lng = position.coords.longitude
      var square = function(x) { return x * x }
      var distance = function(stop) { return square(stop.Latitude - lat) + square(stop.Longitude - lng) }
      return talai.stops.then(function(stops) {
        var best = _.min(stops.Stop, distance)
        $scope.nearby = [ best ]
      })
    }, $scope.err('Cannot find location the location!'))
  }
  $scope.detectLocation()
})

}()



