<script lang="ts">
	import { onMount } from 'svelte';
	import { writable, get } from 'svelte/store';
	import { Loader } from '@googlemaps/js-api-loader';

	let geocoder: google.maps.Geocoder;
	let map: google.maps.Map;
	let mapElement: HTMLElement;
	const marker = writable<google.maps.marker.AdvancedMarkerElement | null>(null);
	const showDebug = writable(false);
	const showMap = writable(false);
	const longitude = writable('');
	const latitude = writable('');
	const addressString = writable('');
	const lookupResult = writable<Record<string, string>>({});
	const rawGeocodeResponse = writable<google.maps.GeocoderResult | null>(null);

	let street: string = $state('');
	let other: string = $state('');
	let borough: string = $state('');
	let town: string = $state('');
	let county: string = $state('');
	let province: string = $state('');
	let zip: string = $state('');
	let nation: string = $state('');

	interface PlaceSelectEvent extends Event {
		place: {
			fetchFields: (options: { fields: string[] }) => Promise<void>;
			location: {
				lng: () => number;
				lat: () => number;
			};
			formattedAddress: string;
		};
	}

	const createMarker = (mapInstance: google.maps.Map, position: google.maps.LatLngLiteral): void => {
		const markerInstance = new google.maps.marker.AdvancedMarkerElement({
			map: mapInstance,
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
	};

	const updateMarker = (position: google.maps.LatLngLiteral): void => {
		const markerInstance = get(marker);
		const mapInstance = map;
		if (markerInstance && mapInstance) {
			markerInstance.position = position;
		} else if (mapInstance) {
			createMarker(mapInstance, position);
		}
		mapInstance?.setCenter(position);
	};

	const updateAddressString = (): void => {
		addressString.set([street, other, borough, town, county, province, zip, nation].filter(Boolean).join(', '));
	};

	const geocodeAddress = (): void => {
		if (!geocoder) {
			console.error('Geocoder is not initialized');
			return;
		}

		const address = get(addressString);
		geocoder.geocode({ address }, (results, status) => {
			if (status === google.maps.GeocoderStatus.OK && results) {
				const result = results[0];
				rawGeocodeResponse.set(result); // Store raw response
				const components = result.address_components.reduce((acc: Record<string, string>, comp) => {
					comp.types.forEach((type) => (acc[type] = comp.long_name));
					return acc;
				}, {});
				lookupResult.set({
					nation: components.country || '',
					province: components.administrative_area_level_1 || '',
					county: components.administrative_area_level_2 || '',
					town: components.locality || '',
					borough: components.sublocality_level_1 || '',
					street: `${components.street_number || ''} ${components.route || ''}`,
					zip: components.postal_code || '',
					long: result.geometry.location.lng().toString(),
					lat: result.geometry.location.lat().toString()
				});

				// Update map and marker
				if (mapElement) {
					updateMarker(result.geometry.location.toJSON());
				}
			}
		});
	};

	const reverseLookup = (): void => {
		if (!geocoder) {
			console.error('Geocoder is not initialized');
			return;
		}

		const long = parseFloat(get(longitude));
		const lat = parseFloat(get(latitude));
		if (long && lat) {
			const location = { lat, lng: long };
			geocoder.geocode({ location }, (results, status) => {
				if (status === google.maps.GeocoderStatus.OK && results) {
					const result = results[0];
					rawGeocodeResponse.set(result); // Store raw response
					const components = result.address_components.reduce((acc: Record<string, string>, comp) => {
						comp.types.forEach((type) => (acc[type] = comp.long_name));
						return acc;
					}, {});
					lookupResult.set({
						nation: components.country || '',
						province: components.administrative_area_level_1 || '',
						county: components.administrative_area_level_2 || '',
						town: components.locality || '',
						borough: components.sublocality_level_1 || '',
						street: `${components.street_number || ''} ${components.route || ''}`,
						zip: components.postal_code || '',
						long: result.geometry.location.lng().toString(),
						lat: result.geometry.location.lat().toString()
					});

					// Update map and marker
					if (mapElement) {
						updateMarker(result.geometry.location.toJSON());
					}
				}
			});
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
		longitude.set(result.long || '');
		latitude.set(result.lat || '');
		updateAddressString();
	};

	onMount(async () => {
		const loader = new Loader({
			apiKey: window.atob('QUl6YVN5RHhfbU1IblB5YlpZRVVsYXBfY1J2UmNKT3kzalcySW9j'),
			version: 'beta',
			libraries: ['places', 'marker', 'geocoding']
		});

		const { Map } = await loader.importLibrary('maps');

		mapElement = document.getElementById('map') as HTMLElement;
		geocoder = new google.maps.Geocoder();

		if (mapElement) {
			map = new Map(mapElement, {
				center: { lat: 37, lng: -96 },
				zoom: 15,
				draggableCursor: 'crosshair',
				mapId: 'Geocodez'
			});

			showMap.subscribe((value) => {
				mapElement.style.display = value ? 'block' : 'none';
				if (value && !get(marker)) {
					map.setCenter({ lat: 37, lng: -96 });
				}
			});

			const autocomplete = new google.maps.places.PlaceAutocompleteElement({});
			autocomplete.id = 'autocomplete-box';
			const locationSearchDiv = document.getElementById('autocomplete-box') as HTMLElement;
			locationSearchDiv.appendChild(autocomplete);
			autocomplete.addEventListener('gmp-placeselect', async (event) => {
				const placeEvent = event as PlaceSelectEvent;
				const place = placeEvent.place;
				await place.fetchFields({
					fields: ['displayName', 'formattedAddress', 'location']
				});
				addressString.set(place.formattedAddress);
				const location = place.location;
				if (location) {
					longitude.set(location.lng().toString());
					latitude.set(location.lat().toString());
					const latLngLiteral = { lat: location.lat(), lng: location.lng() };
					createMarker(map, latLngLiteral);
					map.setCenter(latLngLiteral);
					reverseLookup();
				}
			});
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

<style>
	/* Add your styles here */
</style>
