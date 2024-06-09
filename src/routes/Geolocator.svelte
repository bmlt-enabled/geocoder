<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { writable, get } from 'svelte/store';

	const geocoder = writable<google.maps.Geocoder | null>(null);
	const map = writable<google.maps.Map | null>(null);
	const marker = writable<google.maps.marker.AdvancedMarkerElement | null>(null);
	const showDebug = writable(false);
	const showMap = writable(false);
	const longitude = writable('');
	const latitude = writable('');
	const addressString = writable('');
	const lookupResult = writable<Record<string, string>>({});
	const rawGeocodeResponse = writable<google.maps.GeocoderResult | null>(null);

	let street = '';
	let other = '';
	let borough = '';
	let town = '';
	let county = '';
	let state = '';
	let zip = '';
	let nation = '';

	const g_map_zoom = 15;

	const initMap = (): void => {
		const mapElement = document.getElementById('map');
		if (mapElement) {
			const mapInstance = new google.maps.Map(mapElement, {
				center: { lat: 37, lng: -96 },
				zoom: g_map_zoom,
				draggableCursor: 'crosshair',
				mapId: 'Geocodez'
			});
			map.set(mapInstance);
		}
	};

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
		const mapInstance = get(map);
		if (markerInstance && mapInstance) {
			markerInstance.position = position;
		} else if (mapInstance) {
			createMarker(mapInstance, position);
		}
		mapInstance?.setCenter(position);
	};

	const updateAddressString = (): void => {
		addressString.set([street, other, borough, town, county, state, zip, nation].filter(Boolean).join(', '));
	};

	const geocodeAddress = (): void => {
		const geocoderInstance = get(geocoder);
		if (!geocoderInstance) {
			console.error('Geocoder is not initialized');
			return;
		}

		const address = get(addressString);
		geocoderInstance.geocode({ address }, (results, status) => {
			if (status === google.maps.GeocoderStatus.OK && results) {
				const result = results[0];
				rawGeocodeResponse.set(result); // Store raw response
				const components = result.address_components.reduce((acc: Record<string, string>, comp) => {
					comp.types.forEach((type) => (acc[type] = comp.long_name));
					return acc;
				}, {});
				lookupResult.set({
					nation: components.country || '',
					state: components.administrative_area_level_1 || '',
					county: components.administrative_area_level_2 || '',
					town: components.locality || '',
					borough: components.sublocality_level_1 || '',
					street: `${components.street_number || ''} ${components.route || ''}`,
					zip: components.postal_code || '',
					long: result.geometry.location.lng().toString(),
					lat: result.geometry.location.lat().toString()
				});

				// Update map and marker
				if (get(showMap)) {
					updateMarker(result.geometry.location.toJSON());
				}
			}
		});
	};

	const reverseLookup = (): void => {
		const geocoderInstance = get(geocoder);
		if (!geocoderInstance) {
			console.error('Geocoder is not initialized');
			return;
		}

		const long = parseFloat(get(longitude));
		const lat = parseFloat(get(latitude));
		if (long && lat) {
			const location = { lat, lng: long };
			geocoderInstance.geocode({ location }, (results, status) => {
				if (status === google.maps.GeocoderStatus.OK && results) {
					const result = results[0];
					rawGeocodeResponse.set(result); // Store raw response
					const components = result.address_components.reduce((acc: Record<string, string>, comp) => {
						comp.types.forEach((type) => (acc[type] = comp.long_name));
						return acc;
					}, {});
					lookupResult.set({
						nation: components.country || '',
						state: components.administrative_area_level_1 || '',
						county: components.administrative_area_level_2 || '',
						town: components.locality || '',
						borough: components.sublocality_level_1 || '',
						street: `${components.street_number || ''} ${components.route || ''}`,
						zip: components.postal_code || '',
						long: result.geometry.location.lng().toString(),
						lat: result.geometry.location.lat().toString()
					});

					// Update map and marker
					if (get(showMap)) {
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
		state = result.state || '';
		zip = result.zip || '';
		nation = result.nation || '';
		longitude.set(result.long || '');
		latitude.set(result.lat || '');
		updateAddressString();
	};

	const initializeGeocoder = (): void => {
		if (typeof google !== 'undefined' && google.maps) {
			geocoder.set(new google.maps.Geocoder());
		} else {
			window.mapReady = () => {
				geocoder.set(new google.maps.Geocoder());
			};
		}
	};

	if (typeof window !== 'undefined') {
		window.mapReady = initializeGeocoder;
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			initializeGeocoder();
		}
	});

	afterUpdate((): void => {
		if (get(showMap) && !get(map)) {
			initMap();
		}
	});
</script>

<div id="bmlt_tools_main_container">
	<div>
		<h1>Enter Address</h1>
		<form on:submit|preventDefault={() => geocodeAddress()}>
			<div class="one_line_form">
				<label for="address">Address:</label>
				<div>{$addressString}</div>
			</div>
			<div class="one_line_form">
				<label for="street">Street Address:</label>
				<input id="street" bind:value={street} on:change={updateAddressString} on:keyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="other">Other Address:</label>
				<input id="other" bind:value={other} on:change={updateAddressString} on:keyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="borough">Borough/Ku:</label>
				<input id="borough" bind:value={borough} on:change={updateAddressString} on:keyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="town">Town:</label>
				<input id="town" bind:value={town} on:change={updateAddressString} on:keyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="county">County/Shire:</label>
				<input id="county" bind:value={county} on:change={updateAddressString} on:keyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="state">State/Province:</label>
				<input id="state" bind:value={state} on:change={updateAddressString} on:keyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="zip">Zip/Postal Code:</label>
				<input id="zip" bind:value={zip} on:change={updateAddressString} on:keyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="nation">Nation:</label>
				<input id="nation" bind:value={nation} on:change={updateAddressString} on:keyup={updateAddressString} />
			</div>
			<div class="one_line_form">
				<label for="longitude">Longitude:</label>
				<input id="longitude" bind:value={$longitude} />
				<label for="latitude">Latitude:</label>
				<input id="latitude" bind:value={$latitude} />
			</div>
			<div class="one_line_form">
				<input type="button" value="Address Lookup" on:click={geocodeAddress} />
				<input type="button" value="Long/Lat Lookup" on:click={reverseLookup} />
				<input type="button" value="Where Am I?" on:click={whereAmI} />
			</div>
		</form>
	</div>
	<div id="bmlt_tools_lookup_container">
		<div class="lookup-header">
			<h1>
				<button on:click={transferLookupToAddress}>^^</button>
				Lookup Result
				<button on:click={transferLookupToAddress}>^^</button>
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
			<span class="value">{$lookupResult.state ?? ''}</span>
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
	<div>
		<label class="checkbox-label">
			<input type="checkbox" bind:checked={$showMap} />
			Show Map
		</label>
		{#if $showMap}
			<div id="map" style="width:100%; height:500px;"></div>
		{/if}
	</div>
	<div>
		<label class="checkbox-label">
			<input type="checkbox" bind:checked={$showDebug} />
			Show Debug
		</label>
		{#if $showDebug}
			<pre>{JSON.stringify($rawGeocodeResponse, null, 2)}</pre>
		{/if}
	</div>
</div>

<style>
	/* Add your styles here */
</style>
