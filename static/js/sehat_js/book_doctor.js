let allDoctors = [];
let currentSpecialty = '';

// Search functionality for specialties
document.getElementById('specialtySearch').addEventListener('input', function (e) {
    const searchTerm = e.target.value.toLowerCase();
    const specialtyCards = document.querySelectorAll('.specialty-card');

    specialtyCards.forEach(card => {
        const specialty = card.getAttribute('data-specialty').toLowerCase();
        const specialtyTitle = card.querySelector('h3').textContent.toLowerCase();
        const specialtyDesc = card.querySelector('p').textContent.toLowerCase();

        if (specialty.includes(searchTerm) || specialtyTitle.includes(searchTerm) || specialtyDesc.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Search functionality for doctors
document.getElementById('doctorSearch').addEventListener('input', function (e) {
    const searchTerm = e.target.value.toLowerCase();
    filterDoctors(searchTerm);
});

function selectSpecialty(specialist) {
    console.log('Selected specialty:', specialist);

    // Update active state
    document.querySelectorAll('.specialty-card').forEach(card => {
        card.classList.remove('active');
    });

    // Find the clicked card and make it active
    const clickedCard = Array.from(document.querySelectorAll('.specialty-card')).find(card => {
        return card.getAttribute('onclick').includes(specialist);
    });
    if (clickedCard) {
        clickedCard.classList.add('active');
    }

    // Update panel title
    document.getElementById('panelTitle').innerHTML = `
                <i class="fas fa-user-doctor"></i>
                ${specialist} Doctors
            `;

    // Show loading state
    showLoadingState();

    // Show doctor search
    document.getElementById('doctorSearch').classList.remove('hidden');
    document.getElementById('doctorSearch').value = '';

    currentSpecialty = specialist;

    // Fetch doctors from backend
    fetch(`/api/doctors/${encodeURIComponent(specialist)}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);

            if (data.success && data.doctors.length > 0) {
                allDoctors = data.doctors;
                displayDoctors(allDoctors);
            } else {
                showNoDoctorsMessage();
            }
        })
        .catch(error => {
            console.error('Error fetching doctors:', error);
            showErrorMessage();
        });
}

function showLoadingState() {
    const panelContent = document.getElementById('panelContent');
    panelContent.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading doctors...</p>
                </div>
            `;
}

function displayDoctors(doctors) {
    const panelContent = document.getElementById('panelContent');

    if (doctors.length === 0) {
        showNoDoctorsMessage();
        return;
    }

    let doctorHTML = '<div class="doctor-list">';

    doctors.forEach(doctor => {
        doctorHTML += `
                    <div class="doctor-item" data-doctor-name="${doctor.name.toLowerCase()}">
                        <div class="doctor-name">
                            <i class="fas fa-user-doctor"></i>
                            Dr. ${doctor.name}
                        </div>
                        <div class="doctor-specialty">${doctor.specialist}</div>
                        <div class="doctor-fees">₹${doctor.fees} consultation fee</div>
                        <button class="book-btn" onclick="bookAppointment(${doctor.id}, '${doctor.name}')">
                            <i class="fas fa-calendar-check"></i> Book Appointment
                        </button>
                    </div>
                `;
    });

    doctorHTML += '</div>';
    panelContent.innerHTML = doctorHTML;
}

function filterDoctors(searchTerm) {
    const doctorItems = document.querySelectorAll('.doctor-item');
    let visibleCount = 0;

    doctorItems.forEach(item => {
        const doctorName = item.getAttribute('data-doctor-name');
        if (doctorName.includes(searchTerm)) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    if (visibleCount === 0 && searchTerm !== '') {
        showNoSearchResults();
    }
}

function showNoDoctorsMessage() {
    const panelContent = document.getElementById('panelContent');
    panelContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No doctors available for ${currentSpecialty} at the moment.</p>
                </div>
            `;
}

function showNoSearchResults() {
    const panelContent = document.getElementById('panelContent');
    panelContent.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No doctors found matching your search.</p>
                </div>
            `;
}

function showErrorMessage() {
    const panelContent = document.getElementById('panelContent');
    panelContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading doctors. Please try again later.</p>
                </div>
            `;
}

function bookAppointment(doctorId, doctorName) {
    alert(`Booking appointment with Dr. ${doctorName}`);
    // Add your booking logic here
}