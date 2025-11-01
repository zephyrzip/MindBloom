document.getElementById('returnHomeBtn').addEventListener('click', function () {
    window.location.href = this.dataset.url;
});
let map;
let geoJsonLayer;
let allMapData = [];
let selectedPincode = null;

// Initialize map
function initMap() {
    map = L.map('map', {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: true
    });

    // Add tile layer with better styling
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors | Mental Health Initiative',
        maxZoom: 18,
        minZoom: 4
    }).addTo(map);

    // Load map data from backend
    loadMapData();
}

// Load map data from API
async function loadMapData() {
    try {
        const response = await fetch('/api/map-data/');

        if (!response.ok) {
            throw new Error('Failed to fetch map data');
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
            allMapData = data.features;
            displayMapData(data);
            updateStatistics(data.features);
            document.getElementById('loadingIndicator').style.display = 'none';
        } else {
            showNoDataMessage();
        }
    } catch (error) {
        console.error('Error loading map data:', error);
        showErrorMessage(error.message);
    }
}

// Display map data
function displayMapData(geojsonData) {
    // Remove existing layer if any
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
    }

    geoJsonLayer = L.geoJSON(geojsonData, {
        style: function (feature) {
            return {
                fillColor: feature.properties.color,
                weight: 2,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function (feature, layer) {
            const props = feature.properties;

            // Create popup content
            const popupContent = `
                        <div class="popup-content">
                            <h4>📍 ${props.pincode}</h4>
                            ${props.office_name ? `<p class="popup-info"><strong>Area:</strong> ${props.office_name}</p>` : ''}
                            ${props.district ? `<p class="popup-info"><strong>District:</strong> ${props.district}</p>` : ''}
                            ${props.region ? `<p class="popup-info"><strong>Region:</strong> ${props.region}</p>` : ''}
                            <p class="popup-info"><strong>Assessments:</strong> ${props.total_assessments}</p>
                            <p class="popup-info"><strong>Avg Score:</strong> ${props.average_score}/400</p>
                            <span class="popup-stress-badge" style="background-color: ${props.color}">
                                ${props.stress_level.toUpperCase()}
                            </span>
                        </div>
                    `;

            layer.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'custom-popup'
            });

            // Hover effect
            layer.on('mouseover', function (e) {
                layer.setStyle({
                    weight: 3,
                    fillOpacity: 0.9
                });
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    layer.bringToFront();
                }
            });

            layer.on('mouseout', function (e) {
                geoJsonLayer.resetStyle(layer);
            });

            // Click to show details in sidebar
            layer.on('click', function (e) {
                showPincodeDetails(props);
                selectedPincode = props.pincode;
            });
        }
    }).addTo(map);

    // Fit map bounds to show all data
    if (geojsonData.features.length > 0) {
        map.fitBounds(geoJsonLayer.getBounds());
    }
}

// Update overall statistics
function updateStatistics(features) {
    const totalPincodes = features.length;
    let totalAssessments = 0;
    let totalScore = 0;
    let highRiskCount = 0;

    features.forEach(feature => {
        const props = feature.properties;
        totalAssessments += props.total_assessments;
        totalScore += props.average_score * props.total_assessments;

        if (props.stress_level === 'concerning') {
            highRiskCount++;
        }
    });

    const avgScore = totalAssessments > 0 ? (totalScore / totalAssessments).toFixed(1) : 0;

    document.getElementById('totalPincodes').textContent = totalPincodes;
    document.getElementById('totalAssessments').textContent = totalAssessments.toLocaleString();
    document.getElementById('avgStressLevel').textContent = avgScore;
    document.getElementById('highRiskAreas').textContent = highRiskCount;
}

// Show pincode details in sidebar
function showPincodeDetails(props) {
    const section = document.getElementById('selectedPincodeSection');
    const info = document.getElementById('selectedPincodeInfo');

    const stressEmoji = {
        'excellent': '🟢',
        'good': '🟡',
        'moderate': '🟠',
        'concerning': '🔴'
    };

    info.innerHTML = `
                <h4>Pincode: ${props.pincode}</h4>
                ${props.office_name ? `<p><strong>Area:</strong> ${props.office_name}</p>` : ''}
                ${props.district ? `<p><strong>District:</strong> ${props.district}</p>` : ''}
                ${props.region ? `<p><strong>Region:</strong> ${props.region}</p>` : ''}
                <p><strong>Total Assessments:</strong> ${props.total_assessments}</p>
                <p><strong>Average Score:</strong> ${props.average_score}/400</p>
                <span class="stress-badge" style="background-color: ${props.color}">
                    ${stressEmoji[props.stress_level]} ${props.stress_level.toUpperCase()}
                </span>
            `;

    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Search pincode
function searchPincode() {
    const searchValue = document.getElementById('pincodeSearch').value.trim();

    if (!/^\d{6}$/.test(searchValue)) {
        alert('Please enter a valid 6-digit pincode');
        return;
    }

    const feature = allMapData.find(f => f.properties.pincode === searchValue);

    if (feature) {
        // Find the layer
        geoJsonLayer.eachLayer(layer => {
            if (layer.feature.properties.pincode === searchValue) {
                map.fitBounds(layer.getBounds(), {
                    maxZoom: 12,
                    padding: [50, 50]
                });
                layer.openPopup();
                showPincodeDetails(feature.properties);
            }
        });
    } else {
        alert(`No assessment data found for pincode: ${searchValue}\n\nThis area may not have any assessments yet.`);
    }
}

// Allow Enter key for search
document.getElementById('pincodeSearch').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        searchPincode();
    }
});

// Reset map view
function resetMapView() {
    if (geoJsonLayer && allMapData.length > 0) {
        map.fitBounds(geoJsonLayer.getBounds());
    } else {
        map.setView([20.5937, 78.9629], 5);
    }
    document.getElementById('selectedPincodeSection').style.display = 'none';
    document.getElementById('pincodeSearch').value = '';
}

// Find user location
async function findMyLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    const btn = event.target.closest('.control-btn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Locating...';

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;

        try {
            const response = await fetch('/api/get-pincode-from-location/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ latitude, longitude })
            });

            const data = await response.json();

            if (data.success && data.pincode) {
                document.getElementById('pincodeSearch').value = data.pincode;
                searchPincode();
            } else {
                alert('Could not find pincode data for your location');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to get location data');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>📍</span> My Location';
        }
    }, (error) => {
        alert('Unable to retrieve your location. Please enable location services.');
        btn.disabled = false;
        btn.innerHTML = '<span>📍</span> My Location';
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

// Refresh map data
async function refreshMapData() {
    const btn = event.target.closest('.control-btn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Refreshing...';

    document.getElementById('loadingIndicator').style.display = 'block';

    await loadMapData();

    btn.disabled = false;
    btn.innerHTML = '<span>🔄</span> Refresh Data';
}

// Show no data message
function showNoDataMessage() {
    document.getElementById('loadingIndicator').innerHTML = `
                <div class="no-data-message">
                    <h3>📊 No Data Available Yet</h3>
                    <p>Be the first to contribute to India's mental health map!</p>
                    <p style="margin-top: 10px; color: #6b7280; font-size: 0.9rem;">
                        Take the assessment to help us understand mental wellness patterns across the country.
                    </p>
                    <a href="/" class="take-assessment-btn">
                        Take Assessment Now
                    </a>
                </div>
            `;
}

// Show error message
function showErrorMessage(message) {
    document.getElementById('loadingIndicator').innerHTML = `
                <div class="error-message">
                    <p style="font-weight: bold; margin-bottom: 10px;">⚠️ Error Loading Map Data</p>
                    <p style="font-size: 0.9rem;">${message || 'Unknown error occurred'}</p>
                    <button class="search-btn" onclick="location.reload()" style="margin-top: 15px;">
                        Retry
                    </button>
                </div>
            `;
}

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', initMap);