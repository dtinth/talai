
{ last, map, values, Obj } = require('prelude-ls')

<- google.maps.event.addDomListener(window, 'load', _)

# create map
options =
  zoom: 15
  center: new google.maps.LatLng(13.85009,100.56895)
  mapTypeId: google.maps.MapTypeId.ROADMAP

google-map = new google.maps.Map $('#map-canvas')[0], options

# json loader
load-json = -> $.getJSON("http://jsonp.jit.su/?url=#{encodeURIComponent it}")

# load the data
promise-stops = load-json "http://kubus.netburzt.com/appapi/mobileService/getRouteAndStop.php"
promise-buses = load-json "http://kubus.netburzt.com/map/getbusposition"

# when info is available, ...
info <- promise-stops.then

# "lat,lng" -> [ lat, lng ]
string-to-coord = (x) -> new google.maps.LatLng ...x.split(',').map(parse-float)
array-to-coord = map string-to-coord
polyline-coords = Obj.map array-to-coord, info.Polyline

# define the polyline colors
line-colors =
  '0': '#777777'
  '1': '#ff0000'
  '2': '#0000ff'
  '3': '#119911'
  '4': '#cccc00'
  '5': '#777777'

# define the marker colors
marker-colors =
  '0': \purple
  '1': \red
  '2': \blue
  '3': \green
  '4': \yellow
  '5': \purple

# let's draw these polylines
for own let line, coords of polyline-coords
  polyline = new google.maps.Polyline(
    path: coords
    geodesic: true
    stroke-color: line-colors[line]
    stroke-weight: 2
    stroke-opacity: 1)
  polyline.set-map google-map

# wait for bus position
buses <- promise-buses.then

# add markers to the map
for let bus in buses
  console.log(bus)
  coord = new google.maps.LatLng +bus.latitude, +bus.longitude
  info-window = new google.maps.InfoWindow(
    content: '<pre>' + JSON.stringify(bus, null, 2) + '</pre>')
  marker = new google.maps.Marker(
    position: coord
    map: google-map
    icon: "http://maps.google.com/mapfiles/ms/icons/#{marker-colors[bus.buslineid]}-dot.png"
    title: bus.busname)
  google.maps.event.add-listener marker, \click, -> info-window.open(google-map, marker)






