﻿function getScript(src) {
	document.write('<' + 'script src="' + src + '"' +
			   ' type="text/javascript"><' + '/script>');
}

//load scripts
getScript("http://maps.googleapis.com/maps/api/js?sensor=false&libraries=drawing");
getScript("http://www.wdbccc.com/WDBCCCMap/js/jquery-ui-1.8.21.custom.min.js");

//enable CSS
jQuery.support.cors = true;

(function ($) {
  $.fn.assetMap = function (options) {

    // Create some defaults, extending them with any options that were provided
    var settings = $.extend({
      'mapCenterLat': 37.914868851081415,
      'mapCenterLng': -122.0017056045532,
      'mapZoom': 10,
      'testMode': false,
      'filterButtons': [{
        Title: "Advice",
        Type: "Advice",
        Icon: "ui-icon-advice",
        DefaultSelected: false
      }, {
        Title: "Financing",
        Type: "Financial",
        Icon: "ui-icon-financing",
        DefaultSelected: false
      }, {
        Title: "Networking",
        Type: "Networking",
        Icon: "ui-icon-networking",
        DefaultSelected: false
      }, {
        Title: "Green Business",
        Type: "Green Business",
        Icon: "ui-icon-green",
        DefaultSelected: false
      }, {
        Title: "Employer Incentives",
        Type: "Workforce",
        Icon: "ui-icon-workforce",
        DefaultSelected: false
      }]
    }, options);


    var overlay, cartodb_imagemaptypeBase, cartodb_imagemaptypeCorridor, userMarker
    alertContainer = null,
    mapContainer = null,
    resultContainer = null,
    buttonListContainer = null,
    geoLocationContainer = null,
    carto_map = null,
    resultsDataList = null,
    resultsProfileData = null,
    markerImage = null,
    cartodb_layer = null;

    /**
     * creating the user click marker -if already created reset the position
     * 
     * @param latLng - Google LatLng object
     */
    var new_marker = function (latLng) {
      if (userMarker) {
        userMarker.setPosition(latLng);
      } else {
        userMarker = new google.maps.Marker({
          position: latLng,
          map: carto_map,
          title: "Your Location",
          icon: markerImage
        });
      }


      $('.resourceColumns', resultContainer).empty();
      getListData();
      getProfileData();
    }

    /**
     * finds location on map based on user input
     * 
     * @param e - eventObject
     */
    var geoAddress = function (e) {
      var address = $('#address').val().toLowerCase().trim(),
          suffix = 'ca',
          latlng = null;

      if (address.indexOf(suffix, address.length - suffix.length) === -1) {
        address = address + ', ca';
      }
      var latlng = Geocoder.codeAddress(address, geoAddress_onPositionUpdate);
      e.preventDefault();
    };

    /**
     * on user entered address search complete set marker or show error
     * 
     * @param e - google latlng object
     */
    geoAddress_onPositionUpdate = function (latlng) {
      if (latlng) {
		new_marker(latlng);
		$(".buttonContainer .searchError", mapContainer).hide();
		$(".geoToggleButton", mapContainer).click();
      } else {
        $(".buttonContainer .searchError", mapContainer).html('Geocode was not successful for the following reason: ' + status).show();
      }
    }

    var Geocoder = {};
    Geocoder.geocoder = new google.maps.Geocoder();

    /**
     * Geocode an address and return via async callback a google.maps.LatLng object 
     * or null if the address couldn't be geocoded.
     * 
     * @param address - The address to geocode (e.g., Martinez, CA)
     * @param callback - The callback function
     */
    Geocoder.codeAddress = function (address, callback) {
      Geocoder.geocoder.geocode(
        {
          'address': address
        },
        function (results, status) {
          var latlng = null;
          if (status == google.maps.GeocoderStatus.OK) {
            latlng = results[0].geometry.location;
          }
          callback(latlng, results, status);
        });
    };

    /**
     * geolocaiton of user if able
     */
    var getUserLocation = function () {
      if (navigator.geolocation) navigator.geolocation.getCurrentPosition(getUserLocation_onPositionUpdate);
      else $(".buttonContainer .searchError", mapContainer).html("navigator.geolocation is not available").show();
    }

    /**
     * geolocation of user set the position on the map.
     * 
     * @param position - Google LatLng object
     */
    var getUserLocation_onPositionUpdate = function (position) {
		var lat = position.coords.latitude;
		var lng = position.coords.longitude;
		
		var markerPoint = new google.maps.LatLng(lat, lng);
		new_marker(markerPoint);
		$(".buttonContainer .searchError", mapContainer).hide();
		$(".geoToggleButton", mapContainer).click();
    }

    /**
     * create the category button list
     */
    var createButtonList = function () {
      //option buttons
      var filterButtons = settings['filterButtons'];
      for (buttonItem in filterButtons) {
        buttonListContainer.append('<input type="checkbox" ' + (filterButtons[buttonItem]["DefaultSelected"] ? 'checked="Checked"' : "") + ' id="check' + buttonItem + '" primaryicon="' + filterButtons[buttonItem]["Icon"] + '" filtertype="' + filterButtons[buttonItem]["Type"] + '" filtername="' + filterButtons[buttonItem]["Title"] + '" /><label for="check' + buttonItem + '">' + filterButtons[buttonItem]["Title"] + '</label>');
      }

      $(function () {
        $("input", buttonListContainer).each(function (index) {
          $(this).button({
            icons: {
              primary: $(this).attr("primaryicon")
            }
          }).click(function () {
            loadResultsDataList();
          });
        });
      });
    }

    /**
     * load resource dataset based on buttons selected
     * creates two columns with grouped items and attemts to keep columns equal
     * 
     * @param data - data from cartodb
     */
    var loadResultsDataList = function (data) {
      var buttonSelectedList = $("input:checkbox:checked", buttonListContainer);
      var rowOne = $('.resourceColumns.Column1', resultContainer);
      var rowTwo = $('.resourceColumns.Column2', resultContainer);

      if (buttonSelectedList.length == 0) buttonSelectedList = $("input:checkbox", buttonListContainer);

      resultContainer.hide();
      $('.resourceGroup', resultContainer).remove();

      if (resultsDataList && resultsDataList.rows && resultsDataList.rows.length > 0) {
        var totalHeight = 0;
        var headingContainerArr = new Array();
        buttonSelectedList.each(function () {
          var filtertype = $(this).attr("filtertype");
          var filtername = $(this).attr("filtername");
          var headingContainer = null;
          var groupHeight = 1;
          $.each(resultsDataList.rows, function (key, val) {
            if (filtertype == val["type"]) {
              if (!headingContainer) {
                headingContainer = $("<div class='resourceGroup'></div>");
                headingContainer.append("<h2>" + filtername + "</h2>");
              }
              groupHeight += 1;

              var itemString = "<div class='resourceItem'><h3>" + val["name"] + "</h3>";
              if (val["url"]) {
                itemString += "<strong>website:</strong> <a href='" + cleanURLLink(val["url"]) + "'>" + cleanURLView(val["url"]) + "</a></br>"
              };
              if (val["phone"]) {
                itemString += "<strong>phone:</strong> " + val["phone"] + "</br>"
              };
              if (val["address"]) {
                itemString += "<strong>address:</strong> " + val["address"] + "</br>"
              };
              if (val["description"]) {
                itemString += val["description"] + "</br>"
              };
              itemString += "</div>";

              var resourceItem = $(itemString).appendTo(headingContainer);
              resourceItem.children("a").click(function () {
                recordOutboundLink(this, 'Resource', val["type"] + " - " + val["name"]);
                return false;
              });
            }
          })

            if (headingContainer != null) {
              totalHeight += groupHeight;
              headingContainerArr.push([headingContainer, groupHeight]);
            }
        })

          var rowCount = 0;
        var rowCountBottom = 0;
        var rowCountTop = 0;

        //find the center
        for (i = 0; i < headingContainerArr.length; i++) {
          rowCountBottom += headingContainerArr[i][1];
          rowCountTop += headingContainerArr[headingContainerArr.length - i - 1][1];
          if (rowCountBottom >= (totalHeight / 2)) {
            rowCount = i
            break;
          } else if (rowCountTop >= (totalHeight / 2)) {
            rowCount = headingContainerArr.length - i - 1
            break;
          }
        }

        //put items into each column
        for (j = 0; j < headingContainerArr.length; j++) {
          if (rowCount >= j) {
            headingContainerArr[j][0].appendTo(rowOne);
          } else {
            headingContainerArr[j][0].appendTo(rowTwo);
          }
        }

        resultContainer.slideDown("800");
      } else {
        rowOne.html("No data found");
        rowTwo.html("");
        resultContainer.slideDown("400");
      }

    }

    /**
     * load resource dataset based on buttons selected
     * creates two columns with grouped items and attemts to keep columns equal
     * 
     * @param data - data from cartodb
     */
    var loadResultsProfileData = function (data) {
      if (resultsProfileData && resultsProfileData.rows && resultsProfileData.rows.length > 0) {
        var val = resultsProfileData.rows[0];
        var itemString = "<div class='resourceItem Profile'><h2>City/CDP: " + val["name"] + "</h2>";
        if (val["chamber_url"]) {
          itemString += "<a target='_blank' href='" + cleanURLLink(val["chamber_url"]) + "'>Chamber of Commerce</a></br>"
        };
        if (val["dem_url"]) {
          itemString += "<a target='_blank' href='" + cleanURLLink(val["dem_url"]) + "'>Demographic Profile</a></br>"
        };
        if (val["econ_url"]) {
          itemString += "<a target='_blank' href='" + cleanURLLink(val["econ_url"]) + "'>Economic Profile</a></br>"
        };
        itemString += "</div>";

        var resourceItem = $(itemString).prependTo($('.resourceColumns.Column1', resultContainer));
        resourceItem.children("a").click(function () {
          recordOutboundLink(this, 'Profile', val["name"]);
          return false;
        });
      }
    }

    /**
     * request resources based on the user selected point
     */
    var getListData = function () {
      if (userMarker) {
        //resultContainer.html("Loading...");

        var lat = userMarker.position.lat();
        var lng = userMarker.position.lng();
        var mapUrl = "http://wdbassetmap.cartodb.com/api/v2/sql/?q=SELECT asset.name, asset.url, asset.description, asset.address, asset.phone, asset.type FROM asset " + "JOIN asset_place ON asset.cartodb_id = asset_place.asset_id JOIN place ON place.cartodb_id = asset_place.place_id WHERE " + "ST_Intersects( place.the_geom, ST_SetSRID(ST_Point(" + lng + "," + lat + "), 4326))";
        if ($.browser.msie && window.XDomainRequest) {
          // Use Microsoft XDR
          var xdr = new XDomainRequest();
          xdr.open("get", mapUrl);
          xdr.onload = function () {
            // XDomainRequest doesn't provide responseXml, so if you need it:
            json = 'json = ' + xdr.responseText; // the string now looks like..  json = { ... };
            eval(json); // json is now a regular JSON object
            resultsDataList = json;
            loadResultsDataList();
          };
          xdr.send();
        } else {
          $.ajax({
            url: mapUrl,
            dataType: 'json',
            success: function (data) {
              resultsDataList = data;
              loadResultsDataList();
            },
            error: function (data) {
              alert(data.statusText);
            }
          });
        }
      } else {
        alertContainer.html("Please select location on map");
      }
    }

    /**
     * request location profile based on the user selected point
     */
    var getProfileData = function () {
      if (userMarker) {
        var lat = userMarker.position.lat();
        var lng = userMarker.position.lng();
        var mapUrl = "http://wdbassetmap.cartodb.com/api/v2/sql/?q=SELECT place_profiles.name, place_profiles.chamber_url, place_profiles.dem_url, place_profiles.econ_url, place_profiles.county FROM place_profiles " + "JOIN place ON place.name = place_profiles.name WHERE " + "ST_Intersects( place.the_geom, ST_SetSRID(ST_Point(" + lng + "," + lat + "), 4326))";
        if ($.browser.msie && window.XDomainRequest) {
          // Use Microsoft XDR
          var xdr = new XDomainRequest();
          xdr.open("get", mapUrl);
          xdr.onload = function () {
            // XDomainRequest doesn't provide responseXml, so if you need it:
            json = 'json = ' + xdr.responseText; // the string now looks like..  json = { ... };
            eval(json); // json is now a regular JSON object
            resultsProfileData = json;
            loadResultsProfileData();
          };
          xdr.send();
        } else {
          $.ajax({
            url: mapUrl,
            dataType: 'json',
            success: function (data) {
              resultsProfileData = data;
              loadResultsProfileData();
            },
            error: function (data) {
              alert(data.statusText);
            }
          });
        }
      } else {
        alertContainer.html("Please select location on map");
      }
    }

        /**
         * attempt to track user click to resource though google analytics
         * 
         * @param link - external link to send user
         * @param category - analytics category
         * @param action - analytics action
         */
		var recordOutboundLink = function(link, category, action) {
			if(typeof _gat != 'undefined')
			{
				_gat._getTrackerByName()._trackEvent(category, action);
			}
			window.open(link.href,"_blank");
		}
		
        /**
         * clean the urls from database - remove http:// from view
         */
		var cleanURLView = function(url) {
			return url.replace(/.*?:\/\//g, "");
		}
		
        /**
         * clean the urls from database - add http:// for click
         */
		var cleanURLLink = function(url) {
			if(url.substring(0, 4) != "http"){
				return "http://" + url;
			} else {
				return url;
			}
		}
		
        /**
         * create the home button on the map
         * 
         * @param controlDiv - div control container on map
         * @param map - google map
         */
		var HomeControl = function(controlDiv, map) {
			controlDiv.className = 'buttonContainer';
			
			var geoLocationButton = $('<div class="mapButton"><strong>Home<strong></div>').appendTo(controlDiv);
			var homeLocation = new google.maps.LatLng(settings['mapCenterLat'], settings['mapCenterLng']);
	
			// Setup the click event listeners
			geoLocationButton.click(function() {
				carto_map.setCenter(homeLocation);
				carto_map.setZoom(settings['mapZoom']);
			});
		}
        
        /**
         * create the layers button on the map and all sub controls
         * 
         * @param controlDiv - div control container on map
         * @param map - google map
         */
        var LayersControl = function(controlDiv, map) {
			controlDiv.className = 'buttonContainer';

			var layersButton = $('<div class="mapButton layersToggleButton"><strong>Layers<strong></div>').appendTo(controlDiv);
			var layersControlUI = $('<div class="layersControls subMenu"></div>').attr({ style: 'display:none' }).appendTo(controlDiv);
            
			var baseLayersCheckbox = $('<input />').attr({ type: 'checkbox', id: 'baseCheckbox' }).appendTo(layersControlUI);
			$('<label for="baseCheckbox">City, CDP and County</label>').appendTo(layersControlUI);
			baseLayersCheckbox.click(function (e) {
				var thisCheck = $(this);
				if (thisCheck.is (':checked')){
					carto_map.overlayMapTypes.setAt(0, cartodb_imagemaptypeBase);
				} else {
					if (carto_map.overlayMapTypes.getLength() > 0){
						carto_map.overlayMapTypes.setAt(0, null);
					}
				}
			});
			

			 $('<br />').appendTo(layersControlUI);
			
          var corridorLayersCheckbox = $('<input />').attr({ type: 'checkbox', id: 'corridorCheckbox' }).appendTo(layersControlUI);
			 $('<label for="corridorCheckbox">Green Corridor</label>').appendTo(layersControlUI);
			 corridorLayersCheckbox.click(function (e) {			   
				var thisCheck = $(this);
				if (thisCheck.is (':checked')){
				  carto_map.overlayMapTypes.setAt(1, cartodb_imagemapCorridor);
				} else {
				  if (carto_map.overlayMapTypes.getLength() > 1){
					 carto_map.overlayMapTypes.setAt(1, null);
				  }
				}
			 });

          $('<br />').appendTo(layersControlUI);

          // Special zones layer
          var specialZoneLayersCheckbox = $('<input />').attr({ type: 'checkbox', id: 'specialZoneCheckbox' }).appendTo(layersControlUI);
			 $('<label for="specialZoneCheckbox">Enterprise Zone</label>').appendTo(layersControlUI);
			 specialZoneLayersCheckbox.click(function (e) {			   
				var thisCheck = $(this);
				if (thisCheck.is (':checked')){
				  carto_map.overlayMapTypes.setAt(2, cartodb_imagemapSpecialZone);
				} else {
				  if (carto_map.overlayMapTypes.getLength() > 1){
					 carto_map.overlayMapTypes.setAt(2, null);
				  }
				}
			 });
          
            layersButton.click(function() {
				if(!$(this).hasClass("active")){
					$(this).parent().parent().parent().find(".geoToggleButton.active").click();
					$(this).addClass("active").parent().children(".layersControls").slideDown();
				}else{
					$(this).removeClass("active").parent().children(".layersControls").slideUp("300");
				}
			});
		}
		
		/**
         * create the geocode button on the map and all sub controls
         * 
         * @param controlDiv - div control container on map
         * @param map - google map
         */
		var GeocodeControl = function(controlDiv, map) {
			controlDiv.className = 'buttonContainer';

			var geoLocationButton = $('<div class="mapButton geoToggleButton"><strong>Get my location<strong></div>').appendTo(controlDiv);
			var geoControlUI = $('<div class="geoControls subMenu"></div>').attr({ style: 'display:none' }).appendTo(controlDiv);
            
            geoControlUI.append("<div class='searchError' style='display:none'></div>");
            geoControlUI.append("<strong>Address Search:</strong>");
            var geoTextbox = $('<input />').attr({ type: 'textbox', id: 'address' }).appendTo(geoControlUI);
            var geoButton = $('<input />').attr({ type: 'button', value: 'Find' }).appendTo(geoControlUI);
			geoTextbox.keydown(function (e) {
				if (e.keyCode == 13) {
					geoAddress(e);
				}
			});
            geoButton.click(geoAddress);

            //if geolocation is available add the button
		    if (navigator.geolocation)
		    {
           		geoControlUI.append("<br />");
                geoControlUI.append("<strong>or</strong> ");
                var geoMyButton = $('<a href="#">Find my current location</a>').appendTo(geoControlUI);
                geoMyButton.click(getUserLocation);
		    }

            geoLocationButton.click(function() {
				if(!$(this).hasClass("active")){
					$(this).parent().parent().parent().find(".layersToggleButton.active").click();
					$(this).addClass("active").parent().children(".geoControls").slideDown();
				}else{
					$(this).removeClass("active").parent().children(".geoControls").slideUp("300");
				}
			});
		}
		//*************
		//set up the control
		//**************
		
		this.append("<div id='map'></div><div id='geoLocation'></div>" +
			"<div class='intro'>Select general location on map above to find business resources in your area. You can filter the resources by turning on and off the following categories.</div>" +
			"<div id='data'><div id='alerts'></div><div id='categoryList'><div class='categoryLabel'>Categories:</div><div class='buttonList'></div></div><div id='results'><div class='resourceColumns Column1'>Click your location on the map to get started</div><div class='resourceColumns Column2'></div></div></div>");
		mapContainer = $("#map", this);
		geoLocationContainer = $("#geoLocation", this);
		alertContainer = $("#data #alerts", this);
		resultContainer = $("#data #results", this);
		buttonListContainer = $("#data #categoryList .buttonList", this);
		
		
		markerImage = new google.maps.MarkerImage('http://cartodb-gallery.appspot.com/static/icon.png',
				new google.maps.Size(28, 27),	// size
				new google.maps.Point(0,0),	// origin
				new google.maps.Point(14, 14)	// anchor
			);
		
		//map background layer
		cartodb_layerBase = {
			getTileUrl: function (coord, zoom) {
				var style = "%23place{ [loc_type='City']{polygon-fill:%231166FF; polygon-opacity:0.2; line-opacity:0.7; line-color:%23000000; line-width:0.2;} [loc_type='County']{polygon-fill:%23000000; polygon-opacity:0.0; line-opacity:.4; line-color:%23000000; line-width:0.8;} }";
				var sql = "SELECT name, the_geom_webmercator, loc_type FROM place Where loc_type = 'City' OR loc_type = 'County'"
				return "https://wdbassetmap.cartodb.com/tiles/place/" + zoom + "/" + coord.x + "/" + coord.y + ".png" +
				"?sql=" + sql +"&style="+style;
			},
			tileSize: new google.maps.Size(256, 256)
		};
		
		cartodb_layerCorridor = {
			getTileUrl: function (coord, zoom) {
				var style = "%23place{ [loc_type='Green Corridor']{polygon-fill:%2397BC69; polygon-opacity:0.7; line-opacity:0.7; line-color:%23000000; line-width:0.2; text-name:'[name]'; text-face-name: 'DejaVu Sans Book'; text-fill:%23000; text-size:11; text-line-spacing:1; text-wrap-width:20; text-allow-overlap:true;}}";
				var sql = "SELECT name, the_geom_webmercator, loc_type FROM place Where loc_type = 'Green Corridor'"
				return "https://wdbassetmap.cartodb.com/tiles/place/" + zoom + "/" + coord.x + "/" + coord.y + ".png" +
				"?sql=" + sql +"&style="+style;
			},
			tileSize: new google.maps.Size(256, 256)
		};

      // loc_type = 'special zone' from place table:
		cartodb_special_zone = {
			getTileUrl: function (coord, zoom) {
				//var style = "%23place{ [loc_type='Special Zone']{polygon-fill:%23purple; polygon-opacity:0.7; line-opacity:0.7; line-color:%23000000; line-width:0.2; text-name:'[name]'; text-face-name: 'DejaVu Sans Book'; text-fill:%23000; text-size:11; text-line-spacing:1; text-wrap-width:20; text-allow-overlap:true;}}";
				var sql = "SELECT name, the_geom_webmercator, loc_type FROM place Where loc_type = 'Special Zone'"
				return "https://wdbassetmap.cartodb.com/tiles/place/" + zoom + "/" + coord.x + "/" + coord.y + ".png" +
				"?sql=" + sql; // +"&style="+style;
			},
			tileSize: new google.maps.Size(256, 256)
		};

      
		
		//map options
		var cartodbMapOptions = {
			zoom: settings['mapZoom'],
			center: new google.maps.LatLng(settings['mapCenterLat'], settings['mapCenterLng']),
			disableDefaultUI: true,
			zoomControl: true,
				zoomControlOptions: {
				style: google.maps.ZoomControlStyle.SMALL,
				position: google.maps.ControlPosition.TOP_RIGHT
			},
			mapTypeId: google.maps.MapTypeId.ROADMAP
		}
	
		// Init the map
		carto_map = new google.maps.Map(mapContainer[0], cartodbMapOptions);
	
		google.maps.event.addListener(carto_map, 'click', function (event) {
			new_marker(event.latLng);
		});
	
		//testing and setup data
		if(settings['testMode']){
			google.maps.event.addListener(carto_map, "center_changed", function () {
				var centerLatLng = carto_map.center;
				var boundsLatLng = carto_map.getBounds();
				var zoom = carto_map.zoom;
				var boundsNorthEast = boundsLatLng.getNorthEast();
				var boundsSouthWest = boundsLatLng.getSouthWest();
		
				alertContainer.html('LAT: ' + centerLatLng.lat() + ', LNG ' + centerLatLng.lng() + ', ZOOM: ' + zoom +
					'<br />BOUNDS: SW LAT: ' + boundsSouthWest.lat() + ', LNG ' + boundsSouthWest.lng() + ' - NE LAT: ' + boundsNorthEast.lat() + ', LNG ' + boundsNorthEast.lng());
			});
		}
		
		//create layers button
		var layersControlDiv = document.createElement('div');
		var layersControl = new LayersControl(layersControlDiv, carto_map);
		carto_map.controls[google.maps.ControlPosition.TOP_RIGHT].push(layersControlDiv);
		
		//create map address geocode button
		var geocodeControlDiv = document.createElement('div');
		var geocodeControl = new GeocodeControl(geocodeControlDiv, carto_map);
		carto_map.controls[google.maps.ControlPosition.TOP_RIGHT].push(geocodeControlDiv);
        
		//create map home button
		var homeControlDiv = document.createElement('div');
		var homeControl = new HomeControl(homeControlDiv, carto_map);
		carto_map.controls[google.maps.ControlPosition.TOP_RIGHT].push(homeControlDiv);
		
		// Add the cartodb tiles
		cartodb_imagemaptypeBase = new google.maps.ImageMapType(cartodb_layerBase);
		//carto_map.overlayMapTypes.insertAt(0, cartodb_imagemaptypeBase);
		
		//create the corridor tiles
		cartodb_imagemapCorridor = new google.maps.ImageMapType(cartodb_layerCorridor);
		//carto_map.overlayMapTypes.insertAt(1, cartodb_imagemapCorridor);

		cartodb_imagemapSpecialZone = new google.maps.ImageMapType(cartodb_special_zone);
		//carto_map.overlayMapTypes.insertAt(2, cartodb_imagemapSpecialZone);

		createButtonList();
        return this;
    };
	
})(jQuery);
