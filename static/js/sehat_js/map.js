var map;
var markers = [];
var userMarker = null;
var facilityCount = 0;
var userLat = 20.5937;
var userLng = 78.9629;
var hospitalsData = [];

// Initialize map
function initMap() {
    map = L.map('map').setView([userLat, userLng], 6); // Default India

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 10,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Try to get user's location on load
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            setUserLocation(userLat, userLng);
            fetchHospitals(userLat, userLng, 10000); // 10km radius
        }, function () {
            console.log("Location access denied by user.");
        });
    }
}

// Set user location on the map
function setUserLocation(lat, lng) {
    // Remove existing user marker if any
    // if (userMarker) {
    //     map.removeLayer(userMarker);
    // }

    userLat = lat;
    userLng = lng;

    // Add user marker
    userMarker = L.marker([lat, lng], {
        // icon: L.divIcon({
        //     html: '',
        //     iconSize: [40, 40],
        //     className: 'user-location-icon'
        // })
    }).addTo(map);

    userMarker.bindPopup("You are here").openPopup();

    // Center map on user's location
    map.setView([lat, lng], 13);
}

// Clear existing facility markers
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    facilityCount = 0;
    document.getElementById('facilityCount').style.display = 'none';
}

// Fetch hospitals and clinics from Overpass API
function fetchHospitals(lat, lon, radius) {
    showLoading(true);
    clearMarkers();
    hospitalsData = [];

    var overpassUrl = "https://overpass-api.de/api/interpreter";
    // Query only for hospitals and clinics
    var query = `
                [out:json][timeout:25];
                (
                    node["amenity"="hospital"](around:${radius},${lat},${lon});
                    node["amenity"="clinic"](around:${radius},${lat},${lon});
                    way["amenity"="hospital"](around:${radius},${lat},${lon});
                    way["amenity"="clinic"](around:${radius},${lat},${lon});
                );
                out center;
            `;

    fetch(overpassUrl, {
        method: "POST",
        body: query,
        headers: {
            'Content-Type': 'text/plain'
        }
    })
        .then(res => res.json())
        .then(data => {
            showLoading(false);

            if (data.elements && data.elements.length > 0) {
                data.elements.forEach(place => {
                    let placeLat = place.lat || place.center?.lat;
                    let placeLon = place.lon || place.center?.lon;

                    if (placeLat && placeLon) {
                        let name = place.tags?.name || "Medical Facility";
                        let amenity = place.tags?.amenity || "healthcare";
                        let icon = getIcon(amenity);

                        // Calculate distance from user
                        let distance = calculateDistance(userLat, userLng, placeLat, placeLon);

                        // Generate a mock emergency number
                        let emergencyNumber = generateEmergencyNumber();

                        // Store hospital data
                        hospitalsData.push({
                            id: place.id,
                            name: name,
                            lat: placeLat,
                            lng: placeLon,
                            amenity: amenity,
                            icon: icon,
                            distance: distance,
                            emergency: emergencyNumber
                        });

                        let gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${placeLat},${placeLon}`;

                        let marker = L.marker([placeLat, placeLon], {
                            icon: L.divIcon({
                                html: icon,
                                iconSize: [35, 35],
                                className: 'facility-icon'
                            })
                        }).addTo(map);

                        marker.bindPopup(`
                                <div class="popup-title">${icon} ${name}</div>
                                <div style="color: #666; font-size: 12px; margin: 4px 0;">${capitalizeFirst(amenity)}</div>
                                <div style="color: #666; font-size: 12px; margin: 4px 0;">Distance: ${distance.toFixed(2)} km</div>
                                <div style="color: #e74c3c; font-weight: bold; margin: 4px 0;">Emergency: ${emergencyNumber}</div>
                                <a href="${gmapsUrl}" target="_blank" class="directions-btn">
                                    🚗 Get Directions
                                </a>
                            `);

                        markers.push(marker);
                        facilityCount++;
                    }
                });

                updateFacilityCount();
                displayHospitalList();
            } else {
                alert("No hospitals or clinics found in this area. Try expanding your search radius.");
            }
        })
        .catch(err => {
            showLoading(false);
            console.error('Error fetching hospitals:', err);
            alert("Error loading medical facilities. Please try again.");
        });
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Generate a mock emergency number
function generateEmergencyNumber() {
    // Indian emergency numbers format
    const prefixes = ["108", "102", "104", "112"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${randomPrefix}-${randomSuffix}`;
}

// Display hospital list in the sidebar
function displayHospitalList() {
    const hospitalList = document.getElementById('hospital-list');
    hospitalList.innerHTML = '';
    document.getElementById('list-instruction').style.display = 'none';

    // Sort hospitals by distance
    hospitalsData.sort((a, b) => a.distance - b.distance);

    // Display top 10 nearest hospitals
    hospitalsData.slice(0, 10).forEach(hospital => {
        const listItem = document.createElement('div');
        listItem.className = 'hospital-item';
        listItem.innerHTML = `
                    <h3> ${hospital.name}</h3>
                    <p class="distance">Distance: ${hospital.distance.toFixed(2)} km</p>
                    <div class="emergency-info" id="emergency-${hospital.id}">
                        <p>Emergency: <span class="phone">${hospital.emergency}</span></p>
                        <p>Distance: ${hospital.distance.toFixed(2)} km</p>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}" 
                           target="_blank" class="directions-btn">Get Directions</a>
                    </div>
                `;

        listItem.addEventListener('click', () => {
            // Hide all emergency info first
            document.querySelectorAll('.emergency-info').forEach(info => {
                info.style.display = 'none';
            });
            // Show the clicked hospital's emergency info
            const emergencyInfo = document.getElementById(`emergency-${hospital.id}`);
            emergencyInfo.style.display = 'block';

            // Pan to the hospital on the map
            map.panTo([hospital.lat, hospital.lng]);

            // Open the popup for the corresponding marker
            markers.forEach(marker => {
                const markerLatLng = marker.getLatLng();
                if (markerLatLng.lat === hospital.lat && markerLatLng.lng === hospital.lng) {
                    marker.openPopup();
                }
            });
        });

        hospitalList.appendChild(listItem);
    });
}

// Get appropriate icon for facility type
function getIcon(amenity) {
    switch (amenity.toLowerCase()) {
        case 'hospital': return '🏥';
        case 'clinic': return '🏥';
        default: return '⚕️';
    }
}

// Capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Update facility count display
function updateFacilityCount() {
    const countDiv = document.getElementById('facilityCount');
    countDiv.textContent = `Found ${facilityCount} hospitals and clinics`;
    countDiv.style.display = 'block';
}

// Show/hide loading indicator
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Search for hospital by name
function searchHospital() {
    var searchText = document.getElementById("searchInput").value.trim();
    if (!searchText) {
        alert("Please enter a hospital or clinic name.");
        return;
    }

    showLoading(true);
    var nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText + " hospital India")}&limit=5`;

    fetch(nominatimUrl)
        .then(res => res.json())
        .then(data => {
            showLoading(false);
            if (data.length > 0) {
                var result = data[0];
                var lat = parseFloat(result.lat);
                var lon = parseFloat(result.lon);

                setUserLocation(lat, lon);

                // Clear existing markers and add new search result
                clearMarkers();

                let gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
                let marker = L.marker([lat, lon], {
                    icon: L.divIcon({
                        html: '🏥',
                        iconSize: [40, 40],
                        className: 'search-result-icon'
                    })
                }).addTo(map);

                marker.bindPopup(`
                            <div class="popup-title">${result.display_name.split(',')[0]}</div>
                            <div style="color: #666; font-size: 12px; margin: 4px 0;">Search Result</div>
                            <a href="${gmapsUrl}" target="_blank" class="directions-btn">
                                🚗 Get Directions
                            </a>
                        `).openPopup();

                markers.push(marker);

                // Fetch nearby facilities around the searched location
                setTimeout(() => {
                    fetchHospitals(lat, lon, 5000); // 5km radius around searched location
                }, 1000);

            } else {
                alert("Location not found. Please try a different search term.");
            }
        })
        .catch(err => {
            showLoading(false);
            console.error('Search error:', err);
            alert("Search failed. Please try again.");
        });
}

// Find nearby facilities using current location
function findNearbyFacilities() {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;
            setUserLocation(lat, lon);
            fetchHospitals(lat, lon, 15000); // 15km radius
        }, function () {
            showLoading(false);
            alert("Location access denied. Please enable location services or search manually.");
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Allow search on Enter key press
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('searchInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchHospital();
        }
    });
});

// Fix map not showing on mobile
window.addEventListener("resize", function () {
    if (map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
    }
});

// Initialize the map when page loads
initMap();