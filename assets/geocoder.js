var g_show_debug_checkbox = true;
var g_show_long_lat_info = true;
var g_show_map_checkbox = true;
var geocoder = null;
var geocode_response = null;
var g_pm_index = 0;
var g_pm_index_max = 0;
var g_focused_element = null;
var lets_go = true;

let g_map = null;
let g_marker_set = null;
let g_marker_response = null;
const g_map_zoom = 4;

const image1 = document.createElement("img");
image1.src = "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png"
const g_yellowIcon = document.createElement("img");
g_yellowIcon.src = "https://maps.google.com/intl/en_us/mapfiles/marker_yellow.png";
const g_greyIcon = document.createElement("img");
g_greyIcon.src = "https://maps.google.com/intl/en_us/mapfiles/marker_grey.png";


function GeocodeInitializeOnLoad() {
    if (lets_go) {
        geocoder = new google.maps.Geocoder;
        document.getElementById('bmlt_tools_address_source_container').style.display = 'block';
        document.getElementById('bmlt_tools_address_transfer_container').style.display = 'block';
        document.getElementById('bmlt_tools_address_lookup_container').style.display = 'block';
        if (g_show_long_lat_info && g_show_map_checkbox) {
            document.getElementById('bmlt_tools_map_display').style.display = 'block';
        }
        if (g_show_debug_checkbox) {
            SetBlankDebugData();
            document.getElementById('bmlt_tools_debug_display').style.display = 'block';
        }
        if (navigator && navigator.geolocation) {
            document.getElementById('bmlt_tools_where_am_i').style.display = 'block';
        }
        ClearLookupResults();
        DrawAccuracyScale();
        ClearAddressForm();
        if (g_show_long_lat_info && g_show_map_checkbox) {
            document.getElementById('bmlt_tools_map_checkbox').checked = false;
        }
        if (g_show_debug_checkbox) {
            document.getElementById('bmlt_tools_debug_checkbox').checked = false;
        }
    } else {
        alert('ERROR: Could not create Geocoder object!');
    }
    DisplayLongLat();
}

function trim_str(in_str) {
    return in_str.replace(/^\s+/, '').replace(/\s+$/, '');
}

function DisplayLongLat() {
    if (g_show_long_lat_info) {
        document.getElementById('bmlt_tools_address_long_lat').style.display = 'block';
        document.getElementById('bmlt_tools_transfer_long_lat').style.display = 'block';
        document.getElementById('bmlt_tools_lookup_long_lat_line').style.display = 'block';
    }
}

function SetAccuracyValue(inAcc) {
    var scale_indicator = document.getElementById('bmlt_tools_accuracy_scale');
    if (!scale_indicator) {
        DrawAccuracyScale();
        scale_indicator = document.getElementById('bmlt_tools_accuracy_scale');
    }
    if (scale_indicator) {
        scale_indicator.className = ((inAcc >= 0) && (inAcc < 10)) ? 'acc' + inAcc.toString() : 'accDisabled';
    }
}

function DrawAccuracyScale() {
    if (!document.getElementById('bmlt_tools_accuracy_scale')) {
        var par = document.getElementById('bmlt_tools_accuracy_gradient');
        if (par) {
            for (var i = 1; i < 300; i += 3) {
                var nod = document.createElement("div");
                if (nod) {
                    nod.className = 'line';
                    par.appendChild(nod);
                }
            }
            var slider = document.createElement("div");
            if (slider) {
                slider.id = 'bmlt_tools_accuracy_scale';
                slider.className = 'accDisabled';
                par.appendChild(slider);
            }
        }
    }
}

function WhereAmI() {
    navigator.geolocation.getCurrentPosition(WhereAmI_CallBackSuccess);
}

function WhereAmI_CallBackSuccess(in_position_object) {
    document.getElementById('bmlt_tools_address_long').value = in_position_object.coords.longitude;
    document.getElementById('bmlt_tools_address_lat').value = in_position_object.coords.latitude;
    document.getElementById('bmlt_tools_address_lat').focus();
}

function RestoreFocus() {
    if (g_focused_element) {
        g_focused_element.focus();
    }
}

function ClearAddressForm() {
    document.getElementById('bmlt_tools_address_street').value = '';
    document.getElementById('bmlt_tools_address_other').value = '';
    document.getElementById('bmlt_tools_address_borough').value = '';
    document.getElementById('bmlt_tools_address_town').value = '';
    document.getElementById('bmlt_tools_address_county').value = '';
    document.getElementById('bmlt_tools_address_state').value = '';
    document.getElementById('bmlt_tools_address_zip').value = '';
    document.getElementById('bmlt_tools_address_nation').value = '';
    document.getElementById('bmlt_tools_address_string').innerHTML = '';
    document.getElementById('bmlt_tools_address_street').focus();
}

function FormSubmitted() {
    if ((g_focused_element.id == 'address_long') || (g_focused_element.id == 'address_lat')) {
        ReverseLookup();
    } else {
        GeocodeAddress();
    }
}

function UpdateAddressString() {
    var ad1 = trim_str(document.getElementById('bmlt_tools_address_street').value);
    var ad2 = trim_str(document.getElementById('bmlt_tools_address_other').value);
    var adb = trim_str(document.getElementById('bmlt_tools_address_borough').value);
    var adt = trim_str(document.getElementById('bmlt_tools_address_town').value);
    var adc = trim_str(document.getElementById('bmlt_tools_address_county').value);
    var ads = trim_str(document.getElementById('bmlt_tools_address_state').value);
    var adz = trim_str(document.getElementById('bmlt_tools_address_zip').value);
    var adn = trim_str(document.getElementById('bmlt_tools_address_nation').value);
    var final_string = '';
    if (ad1) final_string += ad1;
    if (ad2) final_string += (final_string ? ' ' : '') + ad2;
    if (adb) final_string += (final_string ? ', ' : '') + adb;
    if (adt) final_string += (final_string ? ', ' : '') + adt;
    if (adc) final_string += (final_string ? ', ' : '') + adc;
    if (ads) final_string += (final_string ? ', ' : '') + ads;
    if (adz) final_string += (final_string ? ' ' : '') + adz;
    if (adn) final_string += (final_string ? ', ' : '') + adn;
    document.getElementById('bmlt_tools_address_string').innerHTML = final_string;
}

function GetGeoAddress(address) {
    var f_address = (typeof address == 'string' || address instanceof String) ? address : address.lat() + ',' + address.lng();
    if (geocoder) {
        ClearLookupResults();
        geocode_response = null;
        if (g_show_debug_checkbox) {
            SetBlankDebugData();
        }
        document.getElementById('bmlt_tools_placemark_count').innerHTML = '';
        g_pm_index = 0;
        g_pm_index_max = 0;
        geocoder.geocode({address: f_address}, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                GeoCallback(results[0]);
            }
        });
    }
}

function ClearLookupResults() {
    document.getElementById('bmlt_tools_lookup_address_nation').innerHTML = '&nbsp;';
    document.getElementById('bmlt_tools_lookup_address_state').innerHTML = '&nbsp;';
    document.getElementById('bmlt_tools_lookup_address_county').innerHTML = '&nbsp;';
    document.getElementById('bmlt_tools_lookup_address_town').innerHTML = '&nbsp;';
    document.getElementById('bmlt_tools_lookup_address_borough').innerHTML = '&nbsp;';
    document.getElementById('bmlt_tools_lookup_address_street').innerHTML = '&nbsp;';
    document.getElementById('bmlt_tools_lookup_address_zip').innerHTML = '&nbsp;';
    document.getElementById('bmlt_tools_lookup_address_long').innerHTML = '&nbsp;';
    document.getElementById('bmlt_tools_lookup_address_lat').innerHTML = '&nbsp;';
    document.getElementById('bmlt_tools_goo_go').style.display = 'none';
    document.getElementById('bmlt_tools_accuracy_display').style.display = 'none';
    document.getElementById('bmlt_tools_address_transfer_container').style.display = 'none';
    document.getElementById('bmlt_tools_placemark_rotator_controls').style.display = 'none';
    document.getElementById('bmlt_tools_goo_go_a').href = null;
}

function GeoCallback(in_geocode_response) {
    geocode_response = in_geocode_response;
    if (geocode_response) {
        g_pm_index_max = geocode_response.address_components.length;
    }
    if (g_show_debug_checkbox) {
        document.getElementById('bmlt_tools_dump_pre').innerHTML = TraverseJSONTree();
    }
    if (geocode_response) {
        if (g_pm_index_max) {
            g_pm_index = 1;
            DisplayPlacemark();
        } else {
            g_pm_index = 0;
            g_pm_index_max = 0;
            if (g_show_debug_checkbox) {
                SetBlankDebugData();
            }
            geocode_response = null;
            alert('NOTHING FOUND');
        }
    } else {
        g_pm_index = 0;
        g_pm_index_max = 0;
        if (g_show_debug_checkbox) {
            SetBlankDebugData();
        }
        geocode_response = null;
        alert('NO RESPONSE FROM GOOGLE');
    }
}

function MakeGoogleLink() {
    var longitude = parseFloat(document.getElementById('bmlt_tools_lookup_address_long').innerHTML);
    var latitude = parseFloat(document.getElementById('bmlt_tools_lookup_address_lat').innerHTML);
    var uri = 'http://maps.google.com/maps?q=' + latitude + ',' + longitude;
    document.getElementById('bmlt_tools_goo_go').style.display = 'block';
    document.getElementById('bmlt_tools_goo_go_a').href = encodeURI(uri);
}

function DisplayPlacemark() {
    if (geocode_response && geocode_response.address_components.length) {
        let pm = geocode_response;
        let address_component = {};
        for (let i = 0; i < pm.address_components.length; i++) {
            address_component = pm.address_components[i];
            for (let j = 0; j < address_component.types.length; j++) {
                if (address_component.types[j] === 'street_number') pm.address_components.streetNumber = address_component.long_name;
                if (address_component.types[j] === 'route') pm.address_components.street = address_component.long_name;
                if (address_component.types[j] === 'neighborhood') pm.address_components.neighborhood = address_component.long_name;
                if (address_component.types[j] === 'locality') pm.address_components.city = address_component.long_name;
                if (address_component.types[j] === 'administrative_area_level_1') pm.address_components.state = address_component.long_name;
                if (address_component.types[j] === 'administrative_area_level_2') pm.address_components.county = address_component.long_name;
                if (address_component.types[j] === 'country') pm.address_components.country = address_component.long_name;
                if (address_component.types[j] === 'postal_code') pm.address_components.zip = address_component.long_name;
                if (address_component.types[j] === 'postal_code_suffix') pm.address_components.zip += "-" + address_component.long_name;
                if (address_component.types[j] === 'sublocality_level_1') pm.address_components.borough = address_component.long_name;
            }
        }
        document.getElementById('bmlt_tools_address_transfer_container').style.display = 'block';
        if (pm.geometry.location) {
            document.getElementById('bmlt_tools_lookup_address_long').innerHTML = trim_str(pm.geometry.location.lng().toString());
            document.getElementById('bmlt_tools_lookup_address_lat').innerHTML = trim_str(pm.geometry.location.lat().toString());
            MakeGoogleLink();
            if (g_show_long_lat_info && g_show_map_checkbox) {
                SetMapResponseMarker();
            }
        }
        if (pm.address_components.country) document.getElementById('bmlt_tools_lookup_address_nation').innerHTML = trim_str(pm.address_components.country.toString());
        if (pm.address_components.state) document.getElementById('bmlt_tools_lookup_address_state').innerHTML = trim_str(pm.address_components.state.toString());
        if (pm.address_components.county) {
            document.getElementById('bmlt_tools_lookup_address_county').innerHTML = trim_str(pm.address_components.county.toString());
            if (pm.address_components.city) {
                document.getElementById('bmlt_tools_lookup_address_town').innerHTML = trim_str(pm.address_components.city.toString());
                if (pm.address_components.borough) {
                    document.getElementById('bmlt_tools_lookup_address_borough').innerHTML = trim_str(pm.address_components.borough.toString());
                    if (pm.address_components.street) {
                        document.getElementById('bmlt_tools_lookup_address_street').innerHTML = pm.address_components.streetNumber + " " + trim_str(pm.address_components.street.toString());
                    }
                    if (pm.address_components.zip) {
                        document.getElementById('bmlt_tools_lookup_address_zip').innerHTML = trim_str(pm.address_components.zip.toString());
                    }
                } else {
                    if (pm.address_components.street) {
                        document.getElementById('bmlt_tools_lookup_address_street').innerHTML = pm.address_components.streetNumber + " " + trim_str(pm.address_components.street.toString());
                    }
                    if (pm.address_components.zip) {
                        document.getElementById('bmlt_tools_lookup_address_zip').innerHTML = trim_str(pm.address_components.zip.toString());
                    }
                }
            }
        }
    } else {
        alert('ERROR: This placemark cannot be displayed!');
    }
}

function GeocodeAddress() {
    GetGeoAddress(trim_str(document.getElementById('bmlt_tools_address_string').innerHTML));
}

function ReverseLookup() {
    if (document.getElementById('bmlt_tools_address_lat').value || document.getElementById('bmlt_tools_address_long').value) {
        GetGeoAddress(new google.maps.LatLng(parseFloat(document.getElementById('bmlt_tools_address_lat').value), parseFloat(document.getElementById('bmlt_tools_address_long').value)));
    } else {
        alert('ERROR: You need to enter a longitude and latitude!');
    }
}

function TransferValue(in_from, in_to) {
    if (document.getElementById(in_to) && document.getElementById(in_from)) {
        var str_val = trim_str(document.getElementById(in_from).innerHTML);
        document.getElementById(in_to).value = (str_val && str_val != '&nbsp;') ? str_val : '';
        UpdateAddressString();
        document.getElementById(in_to).focus();
    }
}

function SetBlankDebugData() {
    document.getElementById('bmlt_tools_dump_pre').innerHTML = '<span class="no_data_span">NO DATA</span>';
}

function ToggleMapMode() {
    document.getElementById('bmlt_tools_map_div').style.display = (document.getElementById('bmlt_tools_map_div').style.display === 'none') ? 'block' : 'none';

    if (document.getElementById('bmlt_tools_map_div').style.display === 'block') {
        SetUpMap();
    }

    RestoreFocus();
}

function SetUpMap(in_map_center) {
    let g_map_center = new google.maps.LatLng(37, -96);
    if (g_show_long_lat_info && g_show_map_checkbox && (document.getElementById('bmlt_tools_map_div').style.display === 'block')) {
        if (!g_map) {
            let longitude = parseFloat(document.getElementById('bmlt_tools_lookup_address_long').innerHTML);
            let latitude = parseFloat(document.getElementById('bmlt_tools_lookup_address_lat').innerHTML);

            if (isNaN(latitude) || isNaN(longitude)) {
                latitude = 37;
                longitude = -96;
            }

            g_map = new google.maps.Map(document.getElementById('bmlt_tools_map_div'), {
                center: { lat: latitude, lng: longitude },
                zoom: 15,
                draggableCursor: 'crosshair',
                mapId: "Geocodez"
            });

            if (g_map) {
                google.maps.event.addListener(g_map, "dragend", MoveEnd);
                google.maps.event.addListener(g_map, "click", MapClicked);
            }
        }

        if (g_map) {
            if (in_map_center) {
                g_map_center = in_map_center;
            }

            g_map.setCenter(g_map_center, g_map_zoom);

            SetMapResponseMarker();
            SetMapEntryMarker();
        }
    }
}


function SetMapEntryMarker() {
    if (g_marker_set) {
        if (g_map) {
            g_marker_set.setMap(null);
        }

        g_marker_set = null;
    }

    if (g_map) {
        const longitude = parseFloat(document.getElementById('bmlt_tools_address_long').value);
        const latitude = parseFloat(document.getElementById('bmlt_tools_address_lat').value);

        if (longitude || latitude) {
            const point = new google.maps.LatLng(latitude, longitude);

            g_marker_set = new google.maps.marker.AdvancedMarkerElement({
                map: g_map,
                position: point,
                gmpDraggable: true,
                title: "Drag to set the longitude and latitude to a New Location.",
                content: g_yellowIcon
            });

            g_marker_set.addEventListener('position_changed', () => {
                g_map.panTo(g_marker_set.position);
            });

            g_marker_set.map = g_map;
            g_marker_set.position = point;
        }
    }
}

function SetMapResponseMarker() {
    if (g_marker_response) {
        if (g_map) {
            g_marker_response.setMap(null);
        }

        g_marker_response = null;
    }

    if (g_map) {
        const longitude = parseFloat(document.getElementById('bmlt_tools_lookup_address_long').innerHTML);
        const latitude = parseFloat(document.getElementById('bmlt_tools_lookup_address_lat').innerHTML);

        if (longitude || latitude) {
            const point = new google.maps.LatLng(latitude, longitude);
            g_marker_response = new google.maps.marker.AdvancedMarkerElement({
                map: g_map,
                position: point,
                gmpClickable: false,
                gmpDraggable: false,
                title: "This is the location of the current placemark.",
                content: g_greyIcon
            });
            g_marker_response.setMap(g_map);
            g_map.panTo(point);
        }
    }
}

function DragEndEntry(in_point) {
    document.getElementById('bmlt_tools_address_long').value = (Math.round(in_point.latLng.lng() * 10000000000) / 10000000000).toString();
    document.getElementById('bmlt_tools_address_lat').value = (Math.round(in_point.latLng.lat() * 10000000000) / 10000000000).toString();
    document.getElementById('bmlt_tools_address_lat').focus();
    SetMapEntryMarker();
}

function MapClicked(in_overlay) {
    DragEndEntry(in_overlay);
}

function MoveEnd() {
    let g_map_center = new google.maps.LatLng(37, -96);
    if (g_map) {
        google.maps.event.addListener(g_map, "zoom_changed", function () {
            g_map_zoom = g_map.getZoom();
        });
        g_map_center = null;
        google.maps.event.addListener(g_map, "center_changed", function () {
            g_map_center = g_map.getCenter();
        });
    }
}

if (g_show_debug_checkbox) {
    function ToggleDebugMode() {
        document.getElementById('bmlt_tools_dump_pre').style.display = (document.getElementById('bmlt_tools_dump_pre').style.display === 'none') ? 'block' : 'none';
        RestoreFocus();
    }

    function TraverseJSONTree() {
        let json_string = '';
        let indent = 0;

        function js_traverse(in_object) {
            let tabs = '';
            const type = typeof in_object;
            if (type === "object") {
                indent++;
                for (let c = 1; c < indent; c++) {
                    tabs += "&middot;&middot; ";
                }
                for (const key in in_object) {
                    if (json_string) {
                        json_string += "\n";
                    }
                    json_string += tabs + key.toString() + ": ";

                    js_traverse(in_object[key]);
                }
                indent--;
            } else {
                json_string += in_object.toString();
            }

            return json_string;
        }

        return js_traverse(geocode_response);
    }
}