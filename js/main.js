$(document).ready(function() {

    // =============== OPEN SOURCE STREET MAP ============================================
    var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
    });

    // =============== OPEN SOURCE TRANSPORT MAP ============================================
    var cartodb_light = L.tileLayer('http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png', {
        maxZoom: 18
    });

    // =============== OPEN SOURCE DARK MATTER MAP ============================================
    var cartodb_dark = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        maxZoom: 18
    });

    // ===== CREATE A LAYER GROUP TO WHICH LATER WE CAN ADD/REMOVE CLUSTER MARKERS ON THE  MAP =================
    var markersLayer = new L.LayerGroup();

    // ===== CREATE A CLUSTER GROUP TO WHICH LATER WE CAN ADD/REMOVE CLUSTER SPOTS ON THE  MAP =================
    var clusterLayer = new L.MarkerClusterGroup();

    // ===== DEFINE OUR BASEMAPS HERE =================
    var baseMaps = {
        "Street Map": osm,
        "Transport Map": cartodb_light,
        "Dark Matter": cartodb_dark
    };

    // ===== OVERLAYS OF THE CLUSTER AND MARKER LAYERS ON THE MAP =================
    var overlays = {
        "Clustered Markers": clusterLayer,
        "Individual Markers": markersLayer
    };

    // ===== INITALISE THE MAP, ZOOM LEVEL, LATITUDE AND LONGITUDE (MIDDLE OF BALTIMORE CITY) =================
    // ===== INITIALISE CLUSTER LAYER + STREET MAP AS DEFAULT BASE MAP ========================================
    var map = L.map('map', {
        center: [39.2833, -76.6167],
        zoom: 12,
        layers: [osm, clusterLayer]
    });

    // ==== ADD THE LAYERS TO A CONTROL GROUP ================================================
    L.control.layers(baseMaps, overlays).addTo(map);

    // =========== CREATE A LEGEND AND ADD TO THE LEAFLET MAP =================================
    var legend = L.control({position: 'bottomright'});
    legend.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = "<div><b>Legend</b><br><table></tr><tr><td><i class='fa fa-star' style='color:darkblue;font-size:1.75em;text-shadow: 2px 2px black;'></i></td><td>&nbsp;&nbsp;Police Station</td></tr><tr><td><img src='js/images/marker-icon.png' style='height:33px' /></td><td>&nbsp;&nbsp;Homicide Incident</td></tr></table></div>";
        return div;
    };
    legend.addTo(map);

    //========================PLOT ALL POLICE STATIONS HERE WITH BLUE STARS========================
    //===================== READS FROM JSON DATA FILE =============================================
    $.getJSON("data/police_stations.json", function(policeStations) {
        $.each(policeStations, function(i) {
            //=========================EXTRACTS OUT ALL JSON DATA FILE ATTRIBUTE ==================
            var name = policeStations[i]["name"];
            var type = policeStations[i]["type"];
            var zipCode = policeStations[i]["zipCode"];
            var neighborhood = policeStations[i]["neighborhood"];
            var councilDistrict = policeStations[i]["councilDistrict"];
            var policeDistrict = policeStations[i]["policeDistrict"];
            var Location = policeStations[i]["Location"];
            var Lat = policeStations[i]["Lat"];
            var Long = policeStations[i]["Long"];

            // ================ MARKER ALL THE POLICE STATIONS ACCORDING TO THE LATITUDE AND LONGITUDE OF STATION ======
            var myIcon = L.divIcon({className: "fa fa-star policeStation"});
            var marker = L.marker([Lat, Long], {icon: myIcon}).addTo(map);
            marker.bindPopup("<b>Name</b>: " + name + "<br><b>Type</b>: " + type + "<br><b>Location</b>: " + Location + "<br><b>Postal Code</b>: " + zipCode + "<br><b>Neighbourhood</b>: " + neighborhood + "<br><b>Council District</b>: " + councilDistrict + "<br><b>Police District</b>: " + policeDistrict);
        });
    });

    // Initialize our dc.js chart
    // Pass the DOM Id in which we want the chart rendered as an argument            
    var weaponChart = dc.rowChart("#weapon-chart");
    var districtChart = dc.rowChart("#district-chart");
    var dayChart = dc.rowChart("#day-chart");
    var dateChart = dc.barChart("#date-chart");

    // This is where we will hold our crossfilter data
    var xdata = null;
    var all = null;
    var locations = null;

    // Called when dc.js is filtered (typically from user click interaction)
    var onFilt = function(chart, filter) {
        updateMap(locations.top(Infinity));
    };

    // updates the displayed map markers to reflect the crossfilter dimension passed in
    var updateMap = function(locs) {
        // clear the existing markers from the map
        markersLayer.clearLayers();
        clusterLayer.clearLayers();

        locs.forEach(function(d, i) {
            if (d.mapped_location.latitude != null && d.mapped_location.latitude != undefined) {
                // add a Leaflet marker for the lat lng
                // insert the application's stated purpose in popup
                var mark = L.marker([d.mapped_location.latitude, d.mapped_location.longitude]).bindPopup(d.purpose);
                markersLayer.addLayer(mark);
                clusterLayer.addLayer(mark);
            }
        });
    };

    // d3's JSON call to grab the JSON data for all the homicide crimes in crime.json
    d3.json("data/crime.json", function(error, data) {
        // used by d3's dateFormat to parse the date correctly
        var dateFormat = d3.time.format("%Y-%m-%dT%H:%M:%S");

        // add map markers to map layer
        data.forEach(function(d, i) {
            d.date_e = dateFormat.parse(d.date);
            // create a map marker if the lat lng is present
            if (d.mapped_location.latitude != null && d.mapped_location.latitude != undefined) {
                d.ll = L.latLng(d.mapped_location.latitude, d.mapped_location.longitude);
                var mark = L.marker([d.mapped_location.latitude, d.mapped_location.longitude]);
                markersLayer.addLayer(mark);
                clusterLayer.addLayer(mark);
            }
        });

        // Construct the charts
        xdata = crossfilter(data);
        all = xdata.groupAll();

        locations = xdata.dimension(function(d) {
            return d.ll;
        });
        var weapons = xdata.dimension(function(d) {
            return d.weapon;
        });
        var districts = xdata.dimension(function(d) {
            return d.district;
        });

        var dayOfWeekNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        var dayOfWeek = xdata.dimension(function(d) {
            return d.date_e.getDay() + "." + dayOfWeekNames [ d.date_e.getDay() ];
        });

        var enteredMonths = xdata.dimension(function(d) {
            return d3.time.month(d.date_e);
        });

        var enteredDates = xdata.dimension(function(d) {
            return d.date_e;
        });

        // Start constructing the charts and setting each chart's options       
        // properties of the weapon row chart
        weaponChart.width($('#weapon-chart').innerWidth() - 15)
                .height(150)
                .colors("#0099CC")
                .margins({top: 10, left: 10, right: 10, bottom: 20})
                .group(weapons.group())
                .dimension(weapons)
                .elasticX(true)
                .on("filtered", onFilt);

        // properties of the district row chart
        districtChart.width($('#weapon-chart').innerWidth() - 15)
                .height(515)
                .colors("#ADD8E6")
                .margins({top: 10, left: 25, right: 10, bottom: 20})
                .group(districts.group())
                .dimension(districts)
                .elasticX(true)
                .on("filtered", onFilt);

        // properties of the day of the week row chart
        dayChart.width($('#weapon-chart').innerWidth() - 15)
                .height(280)
                .colors("#63D1F4")
                .margins({top: 10, left: 10, right: 10, bottom: 20})
                .group(dayOfWeek.group())
                .dimension(dayOfWeek)
                .label(function(d) {
                    return d.key.split(".")[1];
                })
                .title(function(d) {
                    return d.value;
                })
                .elasticX(true)
                .xAxis().ticks(10);
        dayChart.on("filtered", onFilt);

        // properties of the date bar chart
        dateChart.width($('#map').width())
                .height(215)
                .colors("#0EBFE9")
                .margins({top: 10, left: 20, right: 10, bottom: 20})
                .dimension(enteredDates)
                .group(enteredDates.group(d3.time.day))
                .x(d3.time.scale().domain([new Date(2014, 6, 1), new Date(2014, 12, 31)]))
                .round(d3.time.day.round)
                .xUnits(d3.time.days)
                .elasticY(true)
                .elasticX(true)
                .on("filtered", onFilt);
        dateChart.yAxis().ticks(10);
        dateChart.xAxis().ticks(10);

        // ==============FINALLY RENDER ALL THE DC CHARTs =======================================
        dc.renderAll();

        //======================SO THAT MAP BASE LAYER OPTIONS OPEN BY DEFAULT===================
        $(".leaflet-control-layers.leaflet-control").addClass("leaflet-control-layers-expanded");
    });

    // ===================== ON CLICKING THE RESET BUTTON ==============================
    $("#reset").click(function() {
        // Initialize our dc.js chart
        // Pass the DOM Id in which we want the chart rendered as an argument            
        var weaponChart = dc.rowChart("#weapon-chart");
        var districtChart = dc.rowChart("#district-chart");
        var dayChart = dc.rowChart("#day-chart");
        var dateChart = dc.barChart("#date-chart");

        // This is where we will hold our crossfilter data
        var xdata = null;
        var all = null;
        var locations = null;

        // Called when dc.js is filtered (typically from user click interaction)
        var onFilt = function(chart, filter) {
            updateMap(locations.top(Infinity));
        };

        // clear the existing markers from the map
        markersLayer.clearLayers();
        clusterLayer.clearLayers();

        // updates the displayed map markers to reflect the crossfilter dimension passed in
        var updateMap = function(locs) {
            // clear the existing markers from the map
            markersLayer.clearLayers();
            clusterLayer.clearLayers();

            locs.forEach(function(d, i) {
                if (d.mapped_location.latitude != null && d.mapped_location.latitude != undefined) {
                    // add a Leaflet marker for the lat lng
                    // insert the application's stated purpose in popup
                    var mark = L.marker([d.mapped_location.latitude, d.mapped_location.longitude]).bindPopup(d.purpose);
                    markersLayer.addLayer(mark);
                    clusterLayer.addLayer(mark);
                }
            });
        };

        // d3's JSON call to grab the JSON data for all the homicide crimes in crime.json
        d3.json("data/crime.json", function(error, data) {
            // used by d3's dateFormat to parse the date correctly
            var dateFormat = d3.time.format("%Y-%m-%dT%H:%M:%S");

            // add map markers to map layer
            data.forEach(function(d, i) {
                d.date_e = dateFormat.parse(d.date);
                // create a map marker if the lat lng is present
                if (d.mapped_location.latitude != null && d.mapped_location.latitude != undefined) {
                    d.ll = L.latLng(d.mapped_location.latitude, d.mapped_location.longitude);
                    var mark = L.marker([d.mapped_location.latitude, d.mapped_location.longitude]);
                    markersLayer.addLayer(mark);
                    clusterLayer.addLayer(mark);
                }
            });

            // Construct the charts
            xdata = crossfilter(data);
            all = xdata.groupAll();

            locations = xdata.dimension(function(d) {
                return d.ll;
            });
            var weapons = xdata.dimension(function(d) {
                return d.weapon;
            });
            var districts = xdata.dimension(function(d) {
                return d.district;
            });

            var dayOfWeekNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            var dayOfWeek = xdata.dimension(function(d) {
                return d.date_e.getDay() + "." + dayOfWeekNames [ d.date_e.getDay() ];
            });

            var enteredMonths = xdata.dimension(function(d) {
                return d3.time.month(d.date_e);
            });

            var enteredDates = xdata.dimension(function(d) {
                return d.date_e;
            });

            // Start constructing the charts and setting each chart's options       
            // properties of the weapon row chart
            weaponChart.width($('#weapon-chart').innerWidth() - 15)
                    .height(150)
                    .colors("#0099CC")
                    .margins({top: 10, left: 10, right: 10, bottom: 20})
                    .group(weapons.group())
                    .dimension(weapons)
                    .elasticX(true)
                    .on("filtered", onFilt);

            // properties of the district row chart
            districtChart.width($('#weapon-chart').innerWidth() - 15)
                    .height(515)
                    .colors("#ADD8E6")
                    .margins({top: 10, left: 25, right: 10, bottom: 20})
                    .group(districts.group())
                    .dimension(districts)
                    .elasticX(true)
                    .on("filtered", onFilt);

            // properties of the day of the week row chart
            dayChart.width($('#weapon-chart').innerWidth() - 15)
                    .height(280)
                    .colors("#63D1F4")
                    .margins({top: 10, left: 10, right: 10, bottom: 20})
                    .group(dayOfWeek.group())
                    .dimension(dayOfWeek)
                    .label(function(d) {
                        return d.key.split(".")[1];
                    })
                    .title(function(d) {
                        return d.value;
                    })
                    .elasticX(true)
                    .xAxis().ticks(10);
            dayChart.on("filtered", onFilt);

            // properties of the date bar chart
            dateChart.width($('#map').width())
                    .height(215)
                    .colors("#0EBFE9")
                    .margins({top: 10, left: 20, right: 10, bottom: 20})
                    .dimension(enteredDates)
                    .group(enteredDates.group(d3.time.day))
                    .x(d3.time.scale().domain([new Date(2014, 6, 1), new Date(2014, 12, 31)]))
                    .round(d3.time.day.round)
                    .xUnits(d3.time.days)
                    .elasticY(true)
                    .elasticX(true)
                    .on("filtered", onFilt);
            dateChart.yAxis().ticks(10);
            dateChart.xAxis().ticks(10);

            // ==============FINALLY RENDER ALL THE DC CHARTs =======================================
            dc.renderAll();

            //======================SO THAT MAP BASE LAYER OPTIONS OPEN BY DEFAULT===================
            $(".leaflet-control-layers.leaflet-control").addClass("leaflet-control-layers-expanded");
        });
    });
});