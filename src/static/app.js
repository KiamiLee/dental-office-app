// Global variables
let currentSection = 'dashboard';
let patients = [];
let appointments = [];
let treatments = [];
let currentUser = null;

// API base URL
const API_BASE = '/api';

// Authenticated API helper function
async function authenticatedFetch(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    // Check if authentication failed
    if (response.status === 401) {
        window.location.href = '/api/login';
        return null;
    }
    
    return response;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthenticationStatus();
});

// Authentication functions
async function checkAuthenticationStatus() {
    try {
        const response = await fetch(`${API_BASE}/current-user`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = await response.json();
            initializeApp();
        } else {
            // User not authenticated, redirect to login
            window.location.href = '/api/login';
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/api/login';
    }
}

async function logout() {
    try {
        const response = await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/api/login';
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function initializeApp() {
    loadDashboard();
    setupEventListeners();
    updateUserInterface();
}

function updateUserInterface() {
    // Update user info section in the header
    const userInfoSection = document.getElementById('user-info-section');
    if (userInfoSection && currentUser) {
        userInfoSection.innerHTML = `
            <span class="text-light me-3">Welcome, ${currentUser.username}</span>
            <button id="logout-btn" class="btn btn-outline-light btn-sm" onclick="logout()">
                <i class="fas fa-sign-out-alt me-1"></i>Logout
            </button>
        `;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Patient search in patients section
    const patientSearchInput = document.getElementById('patient-search');
    if (patientSearchInput) {
        patientSearchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length > 0) {
                searchPatients(query);
            } else {
                renderPatientCards(patients);
            }
        });
    }

    // Appointment patient search
    const appointmentPatientSearch = document.getElementById('appointment-patient-search');
    if (appointmentPatientSearch) {
        appointmentPatientSearch.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length > 0) {
                searchPatientsForAppointment(query);
            } else {
                hidePatientSearchDropdown();
            }
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!appointmentPatientSearch.contains(e.target) && 
                !document.getElementById('patient-search-dropdown').contains(e.target)) {
                hidePatientSearchDropdown();
            }
        });
    }

    // Appointment filters
    const dateFilter = document.getElementById('appointment-date-filter');
    const statusFilter = document.getElementById('appointment-status-filter');
    if (dateFilter) dateFilter.addEventListener('change', loadAppointments);
    if (statusFilter) statusFilter.addEventListener('change', loadAppointments);

    // Date picker improvements - auto-hide behavior
    setupDatePickerBehavior();
}

function setupDatePickerBehavior() {
    // Add event listeners to all date inputs for improved UX
    document.querySelectorAll('.appointment-date-input').forEach(input => {
        input.addEventListener('focus', function() {
            // Show calendar on focus (native behavior)
            this.showPicker && this.showPicker();
        });
        
        input.addEventListener('change', function() {
            // Auto-hide calendar on selection (native behavior handles this)
            this.blur();
        });
    });
}

// Enhanced patient search for appointment form
async function searchPatientsForAppointment(query) {
    try {
        const response = await authenticatedFetch(`${API_BASE}/patients`);
        if (response && response.ok) {
            const allPatients = await response.json();
            const filteredPatients = allPatients.filter(patient => 
                patient.first_name.toLowerCase().includes(query.toLowerCase()) ||
                patient.last_name.toLowerCase().includes(query.toLowerCase()) ||
                patient.phone.includes(query)
            );
            
            showPatientSearchDropdown(filteredPatients);
        }
    } catch (error) {
        console.error('Error searching patients:', error);
    }
}

function showPatientSearchDropdown(patients) {
    const dropdown = document.getElementById('patient-search-dropdown');
    if (!dropdown) return;

    if (patients.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item text-muted">No patients found</div>';
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = patients.map(patient => `
        <div class="dropdown-item patient-search-item" onclick="selectPatientForAppointment(${patient.id}, '${patient.first_name} ${patient.last_name}')">
            <div class="d-flex align-items-center">
                <div class="patient-avatar-small me-2">
                    ${getPatientInitials(patient.first_name, patient.last_name)}
                </div>
                <div>
                    <div class="fw-bold">${patient.first_name} ${patient.last_name}</div>
                    <small class="text-muted"><i class="fas fa-phone me-1"></i>${patient.phone}</small>
                </div>
            </div>
        </div>
    `).join('');
    
    dropdown.style.display = 'block';
}

function selectPatientForAppointment(patientId, patientName) {
    document.getElementById('appointment-patient-search').value = patientName;
    document.getElementById('appointment-patient').value = patientId;
    hidePatientSearchDropdown();
}

function hidePatientSearchDropdown() {
    const dropdown = document.getElementById('patient-search-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });

    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected section
    const sectionElement = document.getElementById(sectionName + '-section');
    if (sectionElement) {
        sectionElement.style.display = 'block';
    }

    // Add active class to clicked nav link
    if (event && event.target) {
        event.target.classList.add('active');
    }

    currentSection = sectionName;

    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'patients':
            loadPatients();
            break;
        case 'appointments':
            loadAppointments();
            break;
        case 'treatments':
            loadTreatments();
            break;
        case 'reports':
            showReportsWithData();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        // Load dashboard stats
        const response = await authenticatedFetch(`${API_BASE}/reports/dashboard`);
        if (!response) return;
        
        const stats = await response.json();
        
        displayDashboardStats(stats);
        
        // Load today's appointments
        const today = new Date().toISOString().split('T')[0];
        const todayResponse = await authenticatedFetch(`${API_BASE}/appointments?date=${today}`);
        if (!todayResponse) return;
        
        const todayAppointments = await todayResponse.json();
        
        displayTodayAppointments(todayAppointments);
        
        // Load upcoming appointments
        const upcomingResponse = await authenticatedFetch(`${API_BASE}/appointments/upcoming`);
        if (!upcomingResponse) return;
        
        const upcomingAppointments = await upcomingResponse.json();
        
        displayUpcomingAppointments(upcomingAppointments);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

function displayDashboardStats(stats) {
    const statsContainer = document.getElementById('dashboard-stats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="col-md-3">
            <div class="stat-card">
                <h3>${stats.today_appointments}</h3>
                <p><i class="fas fa-calendar-day me-1"></i>Today's Appointments</p>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card success">
                <h3>${stats.week_appointments}</h3>
                <p><i class="fas fa-calendar-week me-1"></i>This Week</p>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card warning">
                <h3>${stats.total_patients}</h3>
                <p><i class="fas fa-users me-1"></i>Total Patients</p>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card info">
                <h3>${stats.upcoming_appointments}</h3>
                <p><i class="fas fa-clock me-1"></i>Upcoming</p>
            </div>
        </div>
    `;
}

function displayTodayAppointments(appointments) {
    const container = document.getElementById('today-appointments');
    if (!container) return;
    
    if (appointments.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No appointments today</p></div>';
        return;
    }
    
    container.innerHTML = appointments.map(appointment => `
        <div class="appointment-item ${appointment.status}">
            <div class="appointment-time">${formatTime(appointment.appointment_date)}</div>
            <div class="appointment-patient">${appointment.patient_name}</div>
            <div class="appointment-treatment">${appointment.treatment_type}</div>
        </div>
    `).join('');
}

function displayUpcomingAppointments(appointments) {
    const container = document.getElementById('upcoming-appointments');
    if (!container) return;
    
    if (appointments.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-plus"></i><p>No upcoming appointments</p></div>';
        return;
    }
    
    container.innerHTML = appointments.slice(0, 5).map(appointment => `
        <div class="appointment-item">
            <div class="appointment-time">${formatDateTime(appointment.appointment_date)}</div>
            <div class="appointment-patient">${appointment.patient_name}</div>
            <div class="appointment-treatment">${appointment.treatment_type}</div>
        </div>
    `).join('');
}

// Enhanced Patient functions
async function loadPatients() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/patients`);
        if (response && response.ok) {
            patients = await response.json();
            renderPatientCards(patients);
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        showError('Failed to load patients');
    }
}

function renderPatientCards(patientList = patients) {
    const container = document.getElementById('patients-container');
    if (!container) return;
    
    if (patientList.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-user-friends"></i>
                    <h4>No Patients Found</h4>
                    <p>Start by adding your first patient to the system.</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = patientList.map(patient => `
        <div class="col-md-6 col-lg-4 col-xl-3 mb-3">
            <div class="patient-card" onclick="selectPatient(${patient.id})">
                <div class="d-flex align-items-center">
                    <div class="patient-avatar me-3">
                        ${getPatientInitials(patient.first_name, patient.last_name)}
                    </div>
                    <div class="patient-info flex-grow-1">
                        <h6 class="mb-1"><strong>${patient.first_name} ${patient.last_name}</strong></h6>
                        <p class="mb-1 text-muted small"><i class="fas fa-phone me-1"></i>${patient.phone}</p>
                        <p class="mb-0 text-muted small"><i class="fas fa-envelope me-1"></i>${patient.email}</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function searchPatients(query) {
    const filteredPatients = patients.filter(patient => 
        patient.first_name.toLowerCase().includes(query.toLowerCase()) ||
        patient.last_name.toLowerCase().includes(query.toLowerCase()) ||
        patient.phone.includes(query) ||
        patient.email.toLowerCase().includes(query.toLowerCase())
    );
    renderPatientCards(filteredPatients);
}

function getPatientInitials(firstName, lastName) {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

async function selectPatient(patientId) {
    try {
        // Load patient details
        const response = await authenticatedFetch(`${API_BASE}/patients/${patientId}`);
        if (response && response.ok) {
            const patient = await response.json();
            showPatientDetails(patient);
        }
    } catch (error) {
        console.error('Error loading patient details:', error);
        showError('Failed to load patient details');
    }
}

async function showPatientDetails(patient) {
    // Load patient's past appointments
    try {
        const response = await authenticatedFetch(`${API_BASE}/appointments?patient_id=${patient.id}`);
        let pastAppointments = [];
        if (response && response.ok) {
            const allAppointments = await response.json();
            pastAppointments = allAppointments.filter(apt => new Date(apt.appointment_date) < new Date());
        }
        
        // Update the existing patient detail modal
        document.getElementById('patient-name-display').innerHTML = `<strong>${patient.first_name} ${patient.last_name}</strong>`;
        document.getElementById('patient-phone-display').textContent = patient.phone;
        document.getElementById('patient-email-display').textContent = patient.email;
        document.getElementById('patient-address-display').textContent = patient.address || 'Not provided';
        document.getElementById('patient-medical-history').value = patient.medical_history || '';
        
        // Update past appointments
        const appointmentsTable = document.getElementById('patient-appointments-history');
        if (pastAppointments.length > 0) {
            appointmentsTable.innerHTML = pastAppointments.map((apt, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${formatDate(apt.appointment_date)}</td>
                    <td>${apt.treatment_name || 'N/A'}</td>
                    <td><span class="badge status-${apt.status}">${apt.status}</span></td>
                </tr>
            `).join('');
        } else {
            appointmentsTable.innerHTML = '<tr><td colspan="4" class="text-center">No past appointments</td></tr>';
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('patientDetailModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading patient appointments:', error);
        showError('Failed to load patient appointments');
    }
}

function showPatientModal(patientId = null) {
    const modal = new bootstrap.Modal(document.getElementById('patientModal'));
    const title = document.getElementById('patientModalTitle');
    
    if (patientId) {
        title.textContent = 'Edit Patient';
        loadPatientData(patientId);
    } else {
        title.textContent = 'Add Patient';
        document.getElementById('patientForm').reset();
        document.getElementById('patient-id').value = '';
    }
    
    modal.show();
}

async function loadPatientData(patientId) {
    try {
        const response = await authenticatedFetch(`${API_BASE}/patients/${patientId}`);
        if (response && response.ok) {
            const patient = await response.json();
            
            document.getElementById('patient-id').value = patient.id;
            document.getElementById('first-name').value = patient.first_name;
            document.getElementById('last-name').value = patient.last_name;
            document.getElementById('email').value = patient.email;
            document.getElementById('phone').value = patient.phone;
            document.getElementById('date-of-birth').value = patient.date_of_birth || '';
            document.getElementById('address').value = patient.address || '';
            document.getElementById('medical-history').value = patient.medical_history || '';
            
            // Set notes if the field exists
            const notesField = document.getElementById('patient-notes');
            if (notesField) {
                notesField.value = patient.notes || '';
            }
        }
    } catch (error) {
        console.error('Error loading patient data:', error);
        showError('Failed to load patient data');
    }
}

async function savePatient() {
    const patientId = document.getElementById('patient-id').value;
    const patientData = {
        first_name: document.getElementById('first-name').value,
        last_name: document.getElementById('last-name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        date_of_birth: document.getElementById('date-of-birth').value || null,
        address: document.getElementById('address').value || null,
        medical_history: document.getElementById('medical-history').value || null
    };
    
    // Add notes if the field exists
    const notesField = document.getElementById('patient-notes');
    if (notesField) {
        patientData.notes = notesField.value || null;
    }
    
    try {
        let response;
        if (patientId) {
            response = await authenticatedFetch(`${API_BASE}/patients/${patientId}`, {
                method: 'PUT',
                body: JSON.stringify(patientData)
            });
        } else {
            response = await authenticatedFetch(`${API_BASE}/patients`, {
                method: 'POST',
                body: JSON.stringify(patientData)
            });
        }
        
        if (response && response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('patientModal')).hide();
            loadPatients();
            showSuccess(patientId ? 'Patient updated successfully' : 'Patient added successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to save patient');
        }
    } catch (error) {
        console.error('Error saving patient:', error);
        showError('Failed to save patient');
    }
}

function editPatient() {
    // Get patient ID from the detail modal and open edit modal
    const patientName = document.getElementById('patient-name-display').textContent;
    // Find patient by name (this is a simplified approach)
    const patient = patients.find(p => `${p.first_name} ${p.last_name}` === patientName);
    if (patient) {
        bootstrap.Modal.getInstance(document.getElementById('patientDetailModal')).hide();
        showPatientModal(patient.id);
    }
}

// Appointment functions
async function loadAppointments() {
    try {
        let url = `${API_BASE}/appointments`;
        const params = new URLSearchParams();
        
        const dateFilter = document.getElementById('appointment-date-filter').value;
        const statusFilter = document.getElementById('appointment-status-filter').value;
        
        if (dateFilter) params.append('date', dateFilter);
        if (statusFilter) params.append('status', statusFilter);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await authenticatedFetch(url);
        if (response && response.ok) {
            appointments = await response.json();
            displayAppointments(appointments);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        showError('Failed to load appointments');
    }
}

function displayAppointments(appointmentList) {
    const tbody = document.querySelector('#appointments-table tbody');
    if (!tbody) return;
    
    if (appointmentList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No appointments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = appointmentList.map(appointment => `
        <tr>
            <td>${formatDateTime(appointment.appointment_date)}</td>
            <td>${appointment.patient_name}</td>
            <td>${appointment.treatment_type}</td>
            <td>${appointment.duration_minutes} min</td>
            <td><span class="badge status-${appointment.status}">${appointment.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editAppointment(${appointment.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteAppointment(${appointment.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function showAppointmentModal(appointmentId = null) {
    const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
    const title = document.getElementById('appointmentModalTitle');
    
    // Load patients and treatments for dropdowns
    loadTreatmentsForDropdown();
    
    if (appointmentId) {
        title.textContent = 'Edit Appointment';
        loadAppointmentData(appointmentId);
    } else {
        title.textContent = 'Schedule Appointment';
        document.getElementById('appointmentForm').reset();
        document.getElementById('appointment-id').value = '';
        document.getElementById('appointment-duration').value = '60';
        document.getElementById('appointment-status').value = 'scheduled';
        
        // Clear patient search
        document.getElementById('appointment-patient-search').value = '';
        document.getElementById('appointment-patient').value = '';
    }
    
    modal.show();
}

async function loadTreatmentsForDropdown() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/treatments?active_only=true`);
        if (response && response.ok) {
            const treatments = await response.json();
            
            const select = document.getElementById('appointment-treatment');
            if (select) {
                select.innerHTML = '<option value="">Select a treatment...</option>' +
                    treatments.map(treatment => `<option value="${treatment.name}" data-duration="${treatment.duration_minutes}">${treatment.name}</option>`).join('');
                
                // Update duration when treatment is selected
                select.addEventListener('change', function() {
                    const selectedOption = this.options[this.selectedIndex];
                    if (selectedOption.dataset.duration) {
                        document.getElementById('appointment-duration').value = selectedOption.dataset.duration;
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading treatments for dropdown:', error);
    }
}

async function loadAppointmentData(appointmentId) {
    try {
        const response = await authenticatedFetch(`${API_BASE}/appointments/${appointmentId}`);
        if (response && response.ok) {
            const appointment = await response.json();
            
            document.getElementById('appointment-id').value = appointment.id;
            document.getElementById('appointment-patient').value = appointment.patient_id;
            document.getElementById('appointment-patient-search').value = appointment.patient_name || '';
            document.getElementById('appointment-date').value = appointment.appointment_date.slice(0, 16);
            document.getElementById('appointment-treatment').value = appointment.treatment_type;
            document.getElementById('appointment-duration').value = appointment.duration_minutes;
            document.getElementById('appointment-notes').value = appointment.notes || '';
            document.getElementById('appointment-status').value = appointment.status;
        }
    } catch (error) {
        console.error('Error loading appointment data:', error);
        showError('Failed to load appointment data');
    }
}

async function saveAppointment() {
    const appointmentId = document.getElementById('appointment-id').value;
    const patientId = document.getElementById('appointment-patient').value;
    
    if (!patientId) {
        showError('Please select a patient');
        return;
    }
    
    const appointmentData = {
        patient_id: parseInt(patientId),
        appointment_date: document.getElementById('appointment-date').value,
        treatment_type: document.getElementById('appointment-treatment').value,
        duration_minutes: parseInt(document.getElementById('appointment-duration').value),
        notes: document.getElementById('appointment-notes').value || null,
        status: document.getElementById('appointment-status').value
    };
    
    try {
        let response;
        if (appointmentId) {
            response = await authenticatedFetch(`${API_BASE}/appointments/${appointmentId}`, {
                method: 'PUT',
                body: JSON.stringify(appointmentData)
            });
        } else {
            response = await authenticatedFetch(`${API_BASE}/appointments`, {
                method: 'POST',
                body: JSON.stringify(appointmentData)
            });
        }
        
        if (response && response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('appointmentModal')).hide();
            loadAppointments();
            showSuccess(appointmentId ? 'Appointment updated successfully' : 'Appointment scheduled successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to save appointment');
        }
    } catch (error) {
        console.error('Error saving appointment:', error);
        showError('Failed to save appointment');
    }
}

function editAppointment(appointmentId) {
    showAppointmentModal(appointmentId);
}

async function deleteAppointment(appointmentId) {
    if (!confirm('Are you sure you want to delete this appointment?')) {
        return;
    }
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'DELETE'
        });
        
        if (response && response.ok) {
            loadAppointments();
            showSuccess('Appointment deleted successfully');
        } else {
            showError('Failed to delete appointment');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showError('Failed to delete appointment');
    }
}

// Treatment functions
async function loadTreatments() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/treatments`);
        if (response && response.ok) {
            treatments = await response.json();
            displayTreatments(treatments);
        }
    } catch (error) {
        console.error('Error loading treatments:', error);
        showError('Failed to load treatments');
    }
}

function displayTreatments(treatmentList) {
    const tbody = document.querySelector('#treatments-table tbody');
    if (!tbody) return;
    
    if (treatmentList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No treatments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = treatmentList.map(treatment => `
        <tr>
            <td>${treatment.name}</td>
            <td>${treatment.description || '-'}</td>
            <td>${treatment.duration_minutes}</td>
            <td>${treatment.price ? '$' + treatment.price.toFixed(2) : '-'}</td>
            <td><span class="badge ${treatment.is_active ? 'bg-success' : 'bg-secondary'}">${treatment.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editTreatment(${treatment.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTreatment(${treatment.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function showTreatmentModal(treatmentId = null) {
    const modal = new bootstrap.Modal(document.getElementById('treatmentModal'));
    const title = document.getElementById('treatmentModalTitle');
    
    if (treatmentId) {
        title.textContent = 'Edit Treatment';
        loadTreatmentData(treatmentId);
    } else {
        title.textContent = 'Add Treatment';
        document.getElementById('treatmentForm').reset();
        document.getElementById('treatment-id').value = '';
        document.getElementById('treatment-duration').value = '60';
        document.getElementById('treatment-active').checked = true;
    }
    
    modal.show();
}

async function loadTreatmentData(treatmentId) {
    try {
        const response = await authenticatedFetch(`${API_BASE}/treatments/${treatmentId}`);
        if (response && response.ok) {
            const treatment = await response.json();
            
            document.getElementById('treatment-id').value = treatment.id;
            document.getElementById('treatment-name').value = treatment.name;
            document.getElementById('treatment-description').value = treatment.description || '';
            document.getElementById('treatment-duration').value = treatment.duration_minutes;
            document.getElementById('treatment-price').value = treatment.price || '';
            document.getElementById('treatment-active').checked = treatment.is_active;
        }
    } catch (error) {
        console.error('Error loading treatment data:', error);
        showError('Failed to load treatment data');
    }
}

async function saveTreatment() {
    const treatmentId = document.getElementById('treatment-id').value;
    const treatmentData = {
        name: document.getElementById('treatment-name').value,
        description: document.getElementById('treatment-description').value || null,
        duration_minutes: parseInt(document.getElementById('treatment-duration').value),
        price: parseFloat(document.getElementById('treatment-price').value) || null,
        is_active: document.getElementById('treatment-active').checked
    };
    
    try {
        let response;
        if (treatmentId) {
            response = await authenticatedFetch(`${API_BASE}/treatments/${treatmentId}`, {
                method: 'PUT',
                body: JSON.stringify(treatmentData)
            });
        } else {
            response = await authenticatedFetch(`${API_BASE}/treatments`, {
                method: 'POST',
                body: JSON.stringify(treatmentData)
            });
        }
        
        if (response && response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('treatmentModal')).hide();
            loadTreatments();
            showSuccess(treatmentId ? 'Treatment updated successfully' : 'Treatment added successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to save treatment');
        }
    } catch (error) {
        console.error('Error saving treatment:', error);
        showError('Failed to save treatment');
    }
}

function editTreatment(treatmentId) {
    showTreatmentModal(treatmentId);
}

async function deleteTreatment(treatmentId) {
    if (!confirm('Are you sure you want to delete this treatment?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE}/treatments/${treatmentId}`, {
            method: 'DELETE'
        });

        if (response && response.ok) {
            loadTreatments();
            showSuccess('Treatment deleted successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete treatment');
        }
    } catch (error) {
        console.error('Error deleting treatment:', error);
        showError('Failed to delete treatment');
    }
}

// User Management functions
async function loadUsers() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/users`);
        if (response && response.ok) {
            const users = await response.json();
            displayUsers(users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

function displayUsers(users) {
    const tbody = document.querySelector('#users-table tbody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function showAddUserModal() {
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    document.getElementById('addUserForm').reset();
    modal.show();
}

async function saveNewUser() {
    const username = document.getElementById('new-username').value;
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    const userData = {
        username: username,
        email: email,
        password: password
    };
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/users`, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response && response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            loadUsers();
            showSuccess('User added successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to add user');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showError('Failed to add user');
    }
}

function showChangePasswordModal() {
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    document.getElementById('changePasswordForm').reset();
    modal.show();
}

async function savePasswordChange() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password-change').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    
    if (newPassword !== confirmNewPassword) {
        showError('New passwords do not match');
        return;
    }
    
    const passwordData = {
        current_password: currentPassword,
        new_password: newPassword
    };
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/change-password`, {
            method: 'POST',
            body: JSON.stringify(passwordData)
        });
        
        if (response && response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
            showSuccess('Password changed successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to change password');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showError('Failed to change password');
    }
}

async function editUser(userId) {
    // Implementation for editing user details
    showError('Edit user functionality not yet implemented');
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response && response.ok) {
            loadUsers();
            showSuccess('User deleted successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Failed to delete user');
    }
}

// Reports functions
async function generateReports() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    try {
        // Load appointment reports
        const appointmentResponse = await authenticatedFetch(`${API_BASE}/reports/appointments?start_date=${startDate}&end_date=${endDate}`);
        if (!appointmentResponse) return;
        
        const appointmentData = await appointmentResponse.json();
        
        // Load revenue reports
        const revenueResponse = await authenticatedFetch(`${API_BASE}/reports/revenue?start_date=${startDate}&end_date=${endDate}`);
        if (!revenueResponse) return;
        
        const revenueData = await revenueResponse.json();
        
        displayReports(appointmentData, revenueData);
        
    } catch (error) {
        console.error('Error generating reports:', error);
        showError('Failed to generate reports');
    }
}

function displayReports(appointmentData, revenueData) {
    const container = document.getElementById('reports-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-chart-pie me-2"></i>Appointments by Status</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="statusChart" height="300"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-chart-bar me-2"></i>Appointments by Treatment</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="treatmentChart" height="300"></canvas>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-chart-line me-2"></i>Daily Appointments</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="dailyChart" height="300"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-dollar-sign me-2"></i>Revenue by Treatment</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="revenueChart" height="300"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create charts
    setTimeout(() => {
        createStatusChart(appointmentData.by_status);
        createTreatmentChart(appointmentData.by_treatment);
        createDailyChart(appointmentData.daily_counts);
        createRevenueChart(revenueData.by_treatment);
    }, 100);
}

function createStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.status),
            datasets: [{
                data: data.map(item => item.count),
                backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6c757d']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function createTreatmentChart(data) {
    const ctx = document.getElementById('treatmentChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: data.map(item => item.treatment_type),
            datasets: [{
                label: 'Appointments',
                data: data.map(item => item.count),
                backgroundColor: '#007bff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createDailyChart(data) {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.map(item => item.date),
            datasets: [{
                label: 'Daily Appointments',
                data: data.map(item => item.count),
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: data.map(item => item.treatment_type),
            datasets: [{
                label: 'Revenue ($)',
                data: data.map(item => item.total_revenue),
                backgroundColor: '#198754'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function showReportsWithData() {
    const container = document.getElementById('reports-content');
    if (!container) return;
    
    // Show a message if no date range is selected
    container.innerHTML = `
        <div class="alert alert-info">
            <h5><i class="fas fa-info-circle me-2"></i>Generate Reports</h5>
            <p>Select a date range above and click "Generate Reports" to view detailed analytics and charts.</p>
            <p><strong>Available Reports:</strong></p>
            <ul>
                <li>Appointments by Status (Scheduled, Completed, Cancelled, No-show)</li>
                <li>Appointments by Treatment Type</li>
                <li>Daily Appointment Trends</li>
                <li>Revenue Analysis by Treatment</li>
            </ul>
        </div>
    `;
}

// Utility functions
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showSuccess(message) {
    // You can implement a toast notification system here
    alert(message);
}

function showError(message) {
    // You can implement a toast notification system here
    alert('Error: ' + message);
}

