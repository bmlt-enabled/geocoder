let g_show_debug_checkbox = true;
let g_show_long_lat_info = true;
let g_show_map_checkbox = true;
let geocoder = null;
let geocode_response = null;
let g_pm_index = 0;
let g_pm_index_max = 0;
let g_focused_element = null;
let lets_go = true;
let g_map = null;
let g_marker_set = null;
let g_marker_response = null;
let g_map_zoom = 4;

const image1 = document.createElement("img");
image1.src = "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png";
const g_yellowIcon = document.createElement("img");
g_yellowIcon.src = "https://maps.google.com/intl/en_us/mapfiles/marker_yellow.png";
const g_greyIcon = document.createElement("img");
g_greyIcon.src = "https://maps.google.com/intl/en_us/mapfiles/marker_grey.png";

function GeocodeInitializeOnLoad() {
    if (lets_go) {
        geocoder = new google.maps.Geocoder();
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
};

const trim_str = (in_str) => in_str.trim();

const DisplayLongLat = () => {
    if (g_show_long_lat_info) {
        document.getElementById('bmlt_tools_address_long_lat').style.display = 'block';
        document.getElementById('bmlt_tools_transfer_long_lat').style.display = 'block';
        document.getElementById('bmlt_tools_lookup_long_lat_line').style.display = 'block';
    }
};

const WhereAmI = () => {
    navigator.geolocation.getCurrentPosition(WhereAmI_CallBackSuccess);
};

const WhereAmI_CallBackSuccess = (in_position_object) => {
    document.getElementById('bmlt_tools_address_long').value = in_position_object.coords.longitude;
    document.getElementById('bmlt_tools_address_lat').value = in_position_object.coords.latitude;
    document.getElementById('bmlt_tools_address_lat').focus();
};

const RestoreFocus = () => {
    if (g_focused_element) {
        g_focused_element.focus();
    }
};

const ClearAddressForm = () => {
    const fields = ['street', 'other', 'borough', 'town', 'county', 'state', 'zip', 'nation'];
    fields.forEach(field => {
        document.getElementById(`bmlt_tools_address_${field}`).value = '';
    });
    document.getElementById('bmlt_tools_address_string').innerHTML = '';
    document.getElementById('bmlt_tools_address_street').focus();
};

const FormSubmitted = () => {
    if (g_focused_element.id === 'address_long' || g_focused_element.id === 'address_lat') {
        ReverseLookup();
    } else {
        GeocodeAddress();
    }
};

const UpdateAddressString = () => {
    const fields = ['street', 'other', 'borough', 'town', 'county', 'state', 'zip', 'nation'];
    document.getElementById('bmlt_tools_address_string').innerHTML = fields.map(field => trim_str(document.getElementById(`bmlt_tools_address_${field}`).value)).filter(Boolean).join(', ');
};

const GetGeoAddress = (address) => {
    const f_address = (typeof address === 'string' || address instanceof String) ? address : `${address.lat()},${address.lng()}`;
    if (geocoder) {
        ClearLookupResults();
        geocode_response = null;
        if (g_show_debug_checkbox) {
            SetBlankDebugData();
        }
        document.getElementById('bmlt_tools_placemark_count').innerHTML = '';
        g_pm_index = 0;
        g_pm_index_max = 0;
        geocoder.geocode({ address: f_address }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK) {
                GeoCallback(results[0]);
            }
        });
    }
};

const ClearLookupResults = () => {
    const fields = ['nation', 'state', 'county', 'town', 'borough', 'street', 'zip', 'long', 'lat'];
    fields.forEach(field => {
        document.getElementById(`bmlt_tools_lookup_address_${field}`).innerHTML = '&nbsp;';
    });
    document.getElementById('bmlt_tools_goo_go').style.display = 'none';
    document.getElementById('bmlt_tools_address_transfer_container').style.display = 'none';
    document.getElementById('bmlt_tools_placemark_rotator_controls').style.display = 'none';
    document.getElementById('bmlt_tools_goo_go_a').href = null;
};

const GeoCallback = (in_geocode_response) => {
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
};

const MakeGoogleLink = () => {
    const longitude = parseFloat(document.getElementById('bmlt_tools_lookup_address_long').innerHTML);
    const latitude = parseFloat(document.getElementById('bmlt_tools_lookup_address_lat').innerHTML);
    const uri = `http://maps.google.com/maps?q=${latitude},${longitude}`;
    document.getElementById('bmlt_tools_goo_go').style.display = 'block';
    document.getElementById('bmlt_tools_goo_go_a').href = encodeURI(uri);
};

const DisplayPlacemark = () => {
    if (geocode_response && geocode_response.address_components.length) {
        const pm = geocode_response;
        const addressComponents = {
            streetNumber: '',
            street: '',
            neighborhood: '',
            city: '',
            state: '',
            county: '',
            country: '',
            zip: '',
            borough: ''
        };

        pm.address_components.forEach(component => {
            component.types.forEach(type => {
                if (type === 'street_number') addressComponents.streetNumber = component.long_name;
                if (type === 'route') addressComponents.street = component.long_name;
                if (type === 'neighborhood') addressComponents.neighborhood = component.long_name;
                if (type === 'locality') addressComponents.city = component.long_name;
                if (type === 'administrative_area_level_1') addressComponents.state = component.long_name;
                if (type === 'administrative_area_level_2') addressComponents.county = component.long_name;
                if (type === 'country') addressComponents.country = component.long_name;
                if (type === 'postal_code') addressComponents.zip = component.long_name;
                if (type === 'postal_code_suffix') addressComponents.zip += `-${component.long_name}`;
                if (type === 'sublocality_level_1') addressComponents.borough = component.long_name;
            });
        });

        document.getElementById('bmlt_tools_address_transfer_container').style.display = 'block';

        if (pm.geometry.location) {
            document.getElementById('bmlt_tools_lookup_address_long').innerHTML = trim_str(pm.geometry.location.lng().toString());
            document.getElementById('bmlt_tools_lookup_address_lat').innerHTML = trim_str(pm.geometry.location.lat().toString());
            MakeGoogleLink();
            if (g_show_long_lat_info && g_show_map_checkbox) {
                SetMapResponseMarker();
            }
        }

        if (addressComponents.country) document.getElementById('bmlt_tools_lookup_address_nation').innerHTML = trim_str(addressComponents.country);
        if (addressComponents.state) document.getElementById('bmlt_tools_lookup_address_state').innerHTML = trim_str(addressComponents.state);
        if (addressComponents.county) document.getElementById('bmlt_tools_lookup_address_county').innerHTML = trim_str(addressComponents.county);
        if (addressComponents.city) document.getElementById('bmlt_tools_lookup_address_town').innerHTML = trim_str(addressComponents.city);
        if (addressComponents.borough) document.getElementById('bmlt_tools_lookup_address_borough').innerHTML = trim_str(addressComponents.borough);
        if (addressComponents.street) {
            const streetAddress = `${addressComponents.streetNumber} ${addressComponents.street}`.trim();
            document.getElementById('bmlt_tools_lookup_address_street').innerHTML = trim_str(streetAddress);
        }
        if (addressComponents.zip) document.getElementById('bmlt_tools_lookup_address_zip').innerHTML = trim_str(addressComponents.zip);
    } else {
        alert('ERROR: This placemark cannot be displayed!');
    }
};


const GeocodeAddress = () => {
    GetGeoAddress(trim_str(document.getElementById('bmlt_tools_address_string').innerHTML));
};

const ReverseLookup = () => {
    if (document.getElementById('bmlt_tools_address_lat').value || document.getElementById('bmlt_tools_address_long').value) {
        GetGeoAddress(new google.maps.LatLng(parseFloat(document.getElementById('bmlt_tools_address_lat').value), parseFloat(document.getElementById('bmlt_tools_address_long').value)));
    } else {
        alert('ERROR: You need to enter a longitude and latitude!');
    }
};

const TransferValue = (in_from, in_to) => {
    if (document.getElementById(in_to) && document.getElementById(in_from)) {
        const str_val = trim_str(document.getElementById(in_from).innerHTML);
        document.getElementById(in_to).value = (str_val && str_val !== '&nbsp;') ? str_val : '';
        UpdateAddressString();
        document.getElementById(in_to).focus();
    }
};

const SetBlankDebugData = () => {
    document.getElementById('bmlt_tools_dump_pre').innerHTML = '<span class="no_data_span">NO DATA</span>';
};

const ToggleMapMode = () => {
    const mapDiv = document.getElementById('bmlt_tools_map_div');
    mapDiv.style.display = (mapDiv.style.display === 'none') ? 'block' : 'none';

    if (mapDiv.style.display === 'block') {
        SetUpMap();
    }

    RestoreFocus();
};

const SetUpMap = (in_map_center) => {
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
};

const SetMapEntryMarker = () => {
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
};

const SetMapResponseMarker = () => {
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
};

const DragEndEntry = (in_point) => {
    document.getElementById('bmlt_tools_address_long').value = (Math.round(in_point.latLng.lng() * 10000000000) / 10000000000).toString();
    document.getElementById('bmlt_tools_address_lat').value = (Math.round(in_point.latLng.lat() * 10000000000) / 10000000000).toString();
    document.getElementById('bmlt_tools_address_lat').focus();
    SetMapEntryMarker();
};

const MapClicked = (in_overlay) => {
    DragEndEntry(in_overlay);
};

const MoveEnd = () => {
    let g_map_center = new google.maps.LatLng(37, -96);
    if (g_map) {
        google.maps.event.addListener(g_map, "zoom_changed", () => {
            g_map_zoom = g_map.getZoom();
        });
        g_map_center = null;
        google.maps.event.addListener(g_map, "center_changed", () => {
            g_map_center = g_map.getCenter();
        });
    }
};


const ToggleDebugMode = () => {
    document.getElementById('bmlt_tools_dump_pre').style.display = (document.getElementById('bmlt_tools_dump_pre').style.display === 'none') ? 'block' : 'none';
    RestoreFocus();
};

const TraverseJSONTree = () => {
    let json_string = '';
    let indent = 0;

    const js_traverse = (in_object) => {
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
                json_string += `${tabs}${key.toString()}: `;

                js_traverse(in_object[key]);
            }
            indent--;
        } else {
            json_string += in_object.toString();
        }

        return json_string;
    };

    return js_traverse(geocode_response);
};
