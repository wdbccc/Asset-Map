/**
 * This file contains a simple geocoding API that rides on the Google Maps 
 * Geocoder.
 * 
 * @see https://developers.google.com/maps/documentation/javascript/reference#Geocoder
 */

var Geocoder = {};

Geocoder.geocoder = new google.maps.Geocoder();

/**
 * Geocode an address and return via async callback a google.maps.LatLng object 
 * or null if the address couldn't be geocoded.
 * 
 * @param address - The address to geocode (e.g., Martinez, CA)
 * @param callback - The callback function
 */
Geocoder.codeAddress = function(address, callback) {
    Geocoder.geocoder.geocode(
        {
            'address': address
        }, 
        function(results, status) {
            var latlng = null;
            if (status == google.maps.GeocoderStatus.OK) {
                latlng = results[0].geometry.location;
            } 
            callback(latlng, results, status);
        }
    );
};
