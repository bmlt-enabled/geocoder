<script lang="ts">
	import { onMount } from 'svelte';
	import { writable, get } from 'svelte/store';
	import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
	import { Geocoder } from '$lib/geocoding';
	import type { Map as LeafletMap, Marker as LeafletMarker, DragEndEvent } from 'leaflet';
	let L: typeof import('leaflet') | null = null;

	let map: google.maps.Map | LeafletMap | null = $state(null);
	let mapElement: HTMLElement;
	const marker = writable<google.maps.marker.AdvancedMarkerElement | LeafletMarker | null>(null);
	const showDebug = writable(false);
	const showMap = writable(false);
	const longitude = writable('');
	const latitude = writable('');
	const addressString = writable('');
	const lookupResult = writable<Record<string, string>>({});
	const rawGeocodeResponse = writable<google.maps.GeocoderResult | null>(null);
	const geocodingService = writable<'google' | 'nominatim'>('google');
	let googleMapsLoaded = $state(false);
	let autocompleteElement: google.maps.places.PlaceAutocompleteElement | null = $state(null);

	let street: string = $state('');
	let other: string = $state('');
	let borough: string = $state('');
	let town: string = $state('');
	let county: string = $state('');
	let province: string = $state('');
	let zip: string = $state('');
	let nation: string = $state('');

	interface PlaceSelectEvent extends Event {
		placePrediction: {
			toPlace: () => {
				fetchFields: (options: { fields: string[] }) => Promise<void>;
				location: {
					lng: () => number;
					lat: () => number;
				};
				formattedAddress: string;
				displayName: string;
				toJSON: () => Record<string, unknown>;
			};
		};
	}

	async function createGoogleMap() {
		if (!mapElement) return;
		setOptions({
			key: window.atob('QUl6YVN5RHhfbU1IblB5YlpZRVVsYXBfY1J2UmNKT3kzalcySW9j'),
			v: 'beta'
		});
		try {
			// Clear any existing map
			if (map) {
				if (L && map instanceof L.Map) {
					map.remove();
				} else if (googleMapsLoaded && map instanceof google.maps.Map) {
					map = null;
				}
				map = null;
			}

			const { Map } = await importLibrary('maps');
			googleMapsLoaded = true;

			// Set up autocomplete as soon as Google Maps is loaded
			await setupGoogleAutocomplete();

			map = new Map(mapElement, {
				center: { lat: 37, lng: -96 },
				zoom: 15,
				draggableCursor: 'crosshair',
				mapId: 'Geocodez'
			});

			if (get(longitude) && get(latitude)) {
				const position = { lat: parseFloat(get(latitude)), lng: parseFloat(get(longitude)) };
				createGoogleMarker(position);
				map.setCenter(position);
			}
		} catch (error) {
			console.error('Error creating Google map:', error);
		}
	}

	async function createLeafletMap() {
		if (!mapElement || !L) return;

		try {
			// Clear any existing map
			if (map) {
				if (L && map instanceof L.Map) {
					map.remove();
				} else if (googleMapsLoaded && map instanceof google.maps.Map) {
					map = null;
				}
				map = null;
			}

			// Clear any existing markers
			const currentMarker = get(marker);
			if (currentMarker) {
				if (L && currentMarker instanceof L.Marker) {
					currentMarker.remove();
				} else if (googleMapsLoaded && 'map' in currentMarker) {
					(currentMarker as google.maps.marker.AdvancedMarkerElement).map = null;
				}
				marker.set(null);
			}

			const leafletMap = L.map(mapElement, {
				preferCanvas: true,
				renderer: L.canvas(),
				zoom: 15,
				center: [37, -96] as [number, number],
				attributionControl: true,
				zoomControl: true
			});

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 18,
				minZoom: 5,
				attribution: '&copy; OpenStreetMap',
				subdomains: ['a', 'b', 'c']
			}).addTo(leafletMap);

			map = leafletMap;

			if (get(longitude) && get(latitude)) {
				const position: [number, number] = [parseFloat(get(latitude)), parseFloat(get(longitude))];
				createLeafletMarker(position);
				map.setView(position);
			}
		} catch (error) {
			console.error('Error creating Leaflet map:', error);
		}
	}

	function createGoogleMarker(position: google.maps.LatLngLiteral) {
		if (!map || !(map instanceof google.maps.Map)) return;

		const markerInstance = new google.maps.marker.AdvancedMarkerElement({
			map: map,
			position: position,
			gmpDraggable: true
		});

		markerInstance.addListener('dragend', () => {
			const newPosition = markerInstance.position;
			if (newPosition) {
				longitude.set((typeof newPosition.lng === 'function' ? newPosition.lng() : newPosition.lng).toString());
				latitude.set((typeof newPosition.lat === 'function' ? newPosition.lat() : newPosition.lat).toString());
			}
		});

		marker.set(markerInstance);
	}

	function createLeafletMarker(position: [number, number]) {
		if (!map || !L || !(map instanceof L.Map)) return;

		const leafletMarker = L.marker(position, { draggable: true }).addTo(map);
		leafletMarker.on('dragend', (event: DragEndEvent) => {
			const newPosition = event.target.getLatLng();
			longitude.set(newPosition.lng.toString());
			latitude.set(newPosition.lat.toString());
		});

		marker.set(leafletMarker);
	}

	const updateMarker = (position: { lat: number; lng: number }): void => {
		const markerInstance = get(marker);
		if (!map) return;

		if (markerInstance) {
			if (googleMapsLoaded && markerInstance instanceof google.maps.marker.AdvancedMarkerElement) {
				markerInstance.position = position;
			} else if (L && markerInstance instanceof L.Marker) {
				markerInstance.setLatLng([position.lat, position.lng]);
			}
		} else {
			if (googleMapsLoaded && map instanceof google.maps.Map) {
				createGoogleMarker(position);
			} else if (L && map instanceof L.Map) {
				createLeafletMarker([position.lat, position.lng]);
			}
		}

		if (googleMapsLoaded && map instanceof google.maps.Map) {
			map.setCenter(position);
		} else if (L && map instanceof L.Map) {
			map.setView([position.lat, position.lng]);
		}
	};

	const updateAddressString = (): void => {
		addressString.set([street, other, borough, town, county, province, zip, nation].filter(Boolean).join(', '));
	};

	const geocodeAddress = async (): Promise<void> => {
		const address = get(addressString);
		const service = get(geocodingService);

		const geocoderLib = new Geocoder(address);
		const geocodingResult = await geocoderLib.geocode(service);
		if (geocodingResult && typeof geocodingResult !== 'string') {
			lookupResult.set({
				nation: geocodingResult.nation,
				province: geocodingResult.province,
				county: geocodingResult.county,
				town: geocodingResult.town,
				borough: geocodingResult.borough,
				street: geocodingResult.street,
				zip: geocodingResult.zip,
				long: geocodingResult.long.toString(),
				lat: geocodingResult.lat.toString()
			});
			rawGeocodeResponse.set(geocodingResult.rawResponse || null);
			if (mapElement) {
				updateMarker({ lat: geocodingResult.lat, lng: geocodingResult.long });
			}
		}
	};

	const reverseLookup = async (): Promise<void> => {
		const long = parseFloat(get(longitude));
		const lat = parseFloat(get(latitude));

		if (long && lat) {
			const reverseGeocoder = new Geocoder({ lat: lat, long: long });
			const service = get(geocodingService);
			const reverseResult = await reverseGeocoder.reverseGeocode(service);
			if (reverseResult && typeof reverseResult !== 'string') {
				lookupResult.set({
					nation: reverseResult.nation,
					province: reverseResult.province,
					county: reverseResult.county,
					town: reverseResult.town,
					borough: reverseResult.borough,
					street: reverseResult.street,
					zip: reverseResult.zip,
					long: reverseResult.long.toString(),
					lat: reverseResult.lat.toString()
				});
				rawGeocodeResponse.set(reverseResult.rawResponse || null);
				if (mapElement) {
					updateMarker({ lat: reverseResult.lat, lng: reverseResult.long });
				}
			}
		}
	};

	const whereAmI = (): void => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition((position) => {
				longitude.set(position.coords.longitude.toString());
				latitude.set(position.coords.latitude.toString());
			});
		}
	};

	const transferLookupToAddress = (): void => {
		const result = get(lookupResult);
		street = result.street || '';
		borough = result.borough || '';
		town = result.town || '';
		county = result.county || '';
		province = result.province || '';
		zip = result.zip || '';
		nation = result.nation || '';
		longitude.set(result.long.toString() || '');
		latitude.set(result.lat.toString() || '');
		updateAddressString();
	};

	async function setupGoogleAutocomplete() {
		if (!googleMapsLoaded) return;

		try {
			// Only create if it doesn't exist
			if (!autocompleteElement) {
				const autocomplete = new google.maps.places.PlaceAutocompleteElement({});
				autocomplete.id = 'criteriaSearch';
				autocompleteElement = autocomplete;

				const locationSearchDiv = document.getElementById('autocomplete-box') as HTMLElement;
				if (!locationSearchDiv) {
					console.error('Cannot find autocomplete-box element');
					return;
				}

				locationSearchDiv.appendChild(autocomplete);

				autocomplete.addEventListener('gmp-select', async (event) => {
					const placeEvent = event as PlaceSelectEvent;
					try {
						const place = placeEvent.placePrediction.toPlace();
						await place.fetchFields({
							fields: ['displayName', 'formattedAddress', 'location']
						});
						const location = place.location;
						if (location) {
							const latLngLiteral = { lat: location.lat(), lng: location.lng() };
							longitude.set(location.lng().toString());
							latitude.set(location.lat().toString());
							updateMarker(latLngLiteral);
							reverseLookup();
						} else {
							console.error('No location data in place object');
						}
					} catch (error) {
						console.error('Error processing place selection:', error);
					}
				});
			}
		} catch (error) {
			console.error('Error setting up autocomplete:', error);
		}
	}

	onMount(async () => {
		if (typeof window !== 'undefined') {
			// Only load Leaflet on the client side
			L = await import('leaflet');
			await import('leaflet/dist/leaflet.css');

			mapElement = document.getElementById('map') as HTMLElement;

			if (mapElement) {
				// Initialize with OSM by default since Nominatim is the default service
				createLeafletMap();

				showMap.subscribe((value) => {
					mapElement.style.display = value ? 'block' : 'none';
					if (value && !get(marker)) {
						if (L && map instanceof L.Map) {
							map.setView([37, -96], 15);
						} else if (map instanceof google.maps.Map) {
							map.setCenter({ lat: 37, lng: -96 });
						}
					}
				});

				// Watch for geocoding service changes
				geocodingService.subscribe(async (service) => {
					if (service === 'google') {
						await createGoogleMap();
					} else {
						await createLeafletMap();
					}
				});

				Promise.all([importLibrary('places'), importLibrary('marker'), importLibrary('geocoding')])
					.then(() => {
						googleMapsLoaded = true;
						setupGoogleAutocomplete();
					})
					.catch((error) => {
						console.error('Error loading Google Maps:', error);
					});
			}
		}
	});
</script>

<div id="bmlt_tools_main_container">
	<div>
		<h1>Enter Address</h1>
		<form onsubmit={geocodeAddress}>
			<div class="one_line_form">
				<label for="locationSearch">Location Search:</label>
				<div id="autocomplete-box"></div>
			</div>
			<div class="one_line_form">
				<label for="geocodingService">Geocoding Service:</label>
				<select id="geocodingService" bind:value={$geocodingService}>
					<option value="nominatim">Nominatim</option>
					<option value="google">Google</option>
				</select>
			</div>
			<div class="one_line_form">
				<label for="address">Address:</label>
				<div>{$addressString}</div>
			</div>
			<div class="one_line_form">
				<label for="street">Street Address:</label>
				<input id="street" bind:value={street} onchange={updateAddressString} onkeyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="other">Other Address:</label>
				<input id="other" bind:value={other} onchange={updateAddressString} onkeyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="borough">Borough/Ku:</label>
				<input id="borough" bind:value={borough} onchange={updateAddressString} onkeyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="town">Town:</label>
				<input id="town" bind:value={town} onchange={updateAddressString} onkeyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="county">County/Shire:</label>
				<input id="county" bind:value={county} onchange={updateAddressString} onkeyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="province">State/Province:</label>
				<input id="province" bind:value={province} onchange={updateAddressString} onkeyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="zip">Zip/Postal Code:</label>
				<input id="zip" bind:value={zip} onchange={updateAddressString} onkeyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="nation">Nation:</label>
				<input id="nation" bind:value={nation} onchange={updateAddressString} onkeyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="longitude">Longitude:</label>
				<input id="longitude" bind:value={$longitude} />
				<label for="latitude">Latitude:</label>
				<input id="latitude" bind:value={$latitude} />
			</div>
			<div class="one_line_form">
				<input type="button" value="Address Lookup" onclick={geocodeAddress} />
				<input type="button" value="Long/Lat Lookup" onclick={reverseLookup} />
				<input type="button" value="Where Am I?" onclick={whereAmI} />
			</div>
		</form>
	</div>
	<div id="bmlt_tools_lookup_container">
		<div class="lookup-header">
			<h1>
				<button onclick={transferLookupToAddress}>^^</button>
				Lookup Result
				<button onclick={transferLookupToAddress}>^^</button>
			</h1>
		</div>
		<div>
			<span class="label">Street Address:</span>
			<span class="value">{$lookupResult.street ?? ''}</span>
		</div>
		<div>
			<span class="label">Borough/Ku:</span>
			<span class="value">{$lookupResult.borough ?? ''}</span>
		</div>
		<div>
			<span class="label">Town:</span>
			<span class="value">{$lookupResult.town ?? ''}</span>
		</div>
		<div>
			<span class="label">County/Shire:</span>
			<span class="value">{$lookupResult.county ?? ''}</span>
		</div>
		<div>
			<span class="label">State/Province:</span>
			<span class="value">{$lookupResult.province ?? ''}</span>
		</div>
		<div>
			<span class="label">Zip/Postal Code:</span>
			<span class="value">{$lookupResult.zip ?? ''}</span>
		</div>
		<div>
			<span class="label">Nation:</span>
			<span class="value">{$lookupResult.nation ?? ''}</span>
		</div>
		<div>
			<span class="label">Longitude:</span>
			<span class="value">{$lookupResult.long ?? ''}</span>
		</div>
		<div>
			<span class="label">Latitude:</span>
			<span class="value">{$lookupResult.lat ?? ''}</span>
		</div>
	</div>
	<div class="map-container">
		<div>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={$showMap} />
				Show Map
			</label>
			<div id="map" class="map-container" style="height: 500px; display: none;"></div>
		</div>
		<div class="debug-container">
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={$showDebug} />
				Show Debug
			</label>
			{#if $showDebug}
				<pre class="debug-text">{JSON.stringify($rawGeocodeResponse, null, 2)}</pre>
			{/if}
		</div>
	</div>
</div>
