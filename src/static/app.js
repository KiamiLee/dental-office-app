let currentSection = 'dashboard';
let patients = [];
let appointments = [];
let treatments = [];
let users = [];
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
    // Add event listeners to all enhanced date inputs for improved UX
    document.querySelectorAll('.enhanced-date-input').forEach(input => {
        input.addEventListener('focus', function() {
            // Show calendar on focus (native behavior)
            if (this.showPicker) this.showPicker();
        });
        
        input.addEventListener('change', function() {
            // Auto-hide calendar on selection by blurring the input
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

// Dashboard functions - FIXED
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
        
        // BUG FIX #3: Load upcoming appointments (next day to end of week) - FIXED DATE LOGIC
        const upcomingAppointments = await loadUpcomingAppointments();
        displayUpcomingAppointments(upcomingAppointments);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

// BUG FIX #3: Fixed upcoming appointments date logic
async function loadUpcomingAppointments() {
    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Calculate end of current week (Sunday)
        const endOfWeek = new Date(now);
        const daysUntilSunday = 7 - endOfWeek.getDay();
        if (daysUntilSunday === 7) {
            // If today is Sunday, get next Sunday
            endOfWeek.setDate(endOfWeek.getDate() + 7);
        } else {
            endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
        }
        
        const startDate = tomorrow.toISOString().split('T')[0];
        const endDate = endOfWeek.toISOString().split('T')[0];
        
        // Use proper date range filtering
        const response = await authenticatedFetch(`${API_BASE}/appointments`);
        if (response && response.ok) {
            const allAppointments = await response.json();
            
            // Filter appointments between tomorrow and end of week
            const upcomingAppointments = allAppointments.filter(appointment => {
                const appointmentDate = new Date(appointment.appointment_date).toISOString().split('T')[0];
                return appointmentDate >= startDate && appointmentDate <= endDate;
            });
            
            return upcomingAppointments;
        }
        return [];
    } catch (error) {
        console.error('Error loading upcoming appointments:', error);
        return [];
    }
}

// Reorder dashboard boxes and remove "This Week"
function displayDashboardStats(stats) {
    const statsContainer = document.getElementById('dashboard-stats');
    if (!statsContainer) return;
    
    // Reorder as Today's Appointments - Upcoming Appointments - Total Patients
    statsContainer.innerHTML = `
        <div class="col-md-4">
            <div class="stat-card">
                <h3>${stats.today_appointments}</h3>
                <p><i class="fas fa-calendar-day me-1"></i>Today's Appointments</p>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card info">
                <h3>${stats.upcoming_appointments}</h3>
                <p><i class="fas fa-clock me-1"></i>Upcoming Appointments</p>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card warning" onclick="navigateToPatients()" style="cursor: pointer;">
                <h3>${stats.total_patients}</h3>
                <p><i class="fas fa-users me-1"></i>Total Patients</p>
            </div>
        </div>
    `;
}

// Navigate to patients tab when clicking Total Patients box
function navigateToPatients() {
    showSection('patients');
    // Update navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes('patients')) {
            link.classList.add('active');
        }
    });
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
            <div class="appointment-treatment">${appointment.treatment_type || 'No treatment specified'}</div>
        </div>
    `).join('');
}

function displayUpcomingAppointments(appointments) {
    const container = document.getElementById('upcoming-appointments');
    if (!container) return;
    
    if (appointments.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-plus"></i><p>No upcoming appointments this week</p></div>';
        return;
    }
    
    container.innerHTML = appointments.slice(0, 5).map(appointment => `
        <div class="appointment-item">
            <div class="appointment-time">${formatDateTime(appointment.appointment_date)}</div>
            <div class="appointment-patient">${appointment.patient_name}</div>
            <div class="appointment-treatment">${appointment.treatment_type || 'No treatment specified'}</div>
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

// Clear filter function for patients
function clearPatientFilters() {
    document.getElementById('patient-search').value = '';
    renderPatientCards(patients);
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

// Show both past and future appointments, fix bug showing same appointments
async function showPatientDetails(patient) {
    try {
        // Load patient's appointments (both past and future)
        const response = await authenticatedFetch(`${API_BASE}/appointments?patient_id=${patient.id}`);
        let patientAppointments = [];
        if (response && response.ok) {
            patientAppointments = await response.json();
        }
        
        // Update the existing patient detail modal
        document.getElementById('patient-name-display').innerHTML = `<strong>${patient.first_name} ${patient.last_name}</strong>`;
        document.getElementById('patient-phone-display').textContent = patient.phone;
        document.getElementById('patient-email-display').textContent = patient.email;
        document.getElementById('patient-address-display').textContent = patient.address || 'Not provided';
        document.getElementById('patient-medical-history').value = patient.medical_history || '';
        
        // Store current patient ID for editing
        document.getElementById('patient-detail-modal').setAttribute('data-patient-id', patient.id);
        
        // Update appointments table with both past and future
        const appointmentsTable = document.getElementById('patient-appointments-history');
        if (patientAppointments.length > 0) {
            // Sort appointments by date
            patientAppointments.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
            
            appointmentsTable.innerHTML = patientAppointments.map((apt, index) => {
                const appointmentDate = new Date(apt.appointment_date);
                const now = new Date();
                const isPast = appointmentDate < now;
                const statusClass = isPast ? 'text-muted' : 'fw-bold';
                
                return `
                    <tr class="${isPast ? 'table-secondary' : ''}">
                        <td>${index + 1}</td>
                        <td class="${statusClass}">${formatDate(apt.appointment_date)}</td>
                        <td>${apt.treatment_name || 'No treatment specified'}</td>
                        <td><span class="badge status-${apt.status}">${apt.status}</span></td>
                    </tr>
                `;
            }).join('');
        } else {
            appointmentsTable.innerHTML = '<tr><td colspan="4" class="text-center">No appointments found</td></tr>';
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

// BUG FIX #4: Fixed patient creation with file attachments
async function savePatient() {
    const patientId = document.getElementById('patient-id').value;
    
    // Validate required fields (email is now optional)
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!firstName || !lastName || !phone) {
        showError('First name, last name, and phone are required');
        return;
    }
    
    const patientData = {
        first_name: firstName,
        last_name: lastName,
        email: document.getElementById('email').value.trim() || null, // Optional
        phone: phone,
        date_of_birth: document.getElementById('date-of-birth').value || null,
        address: document.getElementById('address').value.trim() || null,
        medical_history: document.getElementById('medical-history').value.trim() || null
    };
    
    // Add notes if the field exists
    const notesField = document.getElementById('patient-notes');
    if (notesField) {
        patientData.notes = notesField.value.trim() || null;
    }
    
    // BUG FIX #4: Handle file attachments properly - remove file handling for now since backend doesn't support it
    // File attachments will be handled separately or require backend changes
    
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
    // Get patient ID from the detail modal
    const patientId = document.getElementById('patient-detail-modal').getAttribute('data-patient-id');
    if (patientId) {
        bootstrap.Modal.getInstance(document.getElementById('patientDetailModal')).hide();
        showPatientModal(patientId);
    }
}

// File preview functionality - simplified for now
function previewAttachedFile(input) {
    const file = input.files[0];
    if (!file) return;
    
    const previewContainer = document.getElementById('file-preview-container') || document.getElementById('edit-file-preview-container');
    if (!previewContainer) return;
    
    const fileType = file.type;
    const fileName = file.name;
    
    if (fileType.startsWith('image/')) {
        // Preview image files
        const reader = new FileReader();
        reader.onload = function(e) {
            previewContainer.innerHTML = `
                <div class="file-preview">
                    <h6>File Preview: ${fileName}</h6>
                    <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px;" class="img-thumbnail">
                    <button type="button" class="btn btn-sm btn-outline-danger mt-2" onclick="clearFilePreview()">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    } else if (fileType === 'application/pdf') {
        // Preview PDF files
        previewContainer.innerHTML = `
            <div class="file-preview">
                <h6>File Preview: ${fileName}</h6>
                <div class="alert alert-info">
                    <i class="fas fa-file-pdf"></i> PDF file selected (${(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="clearFilePreview()">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
        `;
    } else {
        // Preview other file types
        previewContainer.innerHTML = `
            <div class="file-preview">
                <h6>File Preview: ${fileName}</h6>
                <div class="alert alert-secondary">
                    <i class="fas fa-file"></i> ${fileType || 'Unknown file type'} (${(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="clearFilePreview()">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
        `;
    }
}

function clearFilePreview() {
    const previewContainer = document.getElementById('file-preview-container') || document.getElementById('edit-file-preview-container');
    const fileInput = document.getElementById('medical-history-file') || document.getElementById('edit-medical-history-file');
    
    if (previewContainer) previewContainer.innerHTML = '';
    if (fileInput) fileInput.value = '';
}

// Appointment functions - FIXED
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
            renderAppointments(appointments);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        showError('Failed to load appointments');
    }
}

// Clear appointment filters
function clearAppointmentFilters() {
    document.getElementById('appointment-date-filter').value = '';
    document.getElementById('appointment-status-filter').value = '';
    loadAppointments();
}

function renderAppointments(appointmentList = appointments) {
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
            <td>${appointment.treatment_name || 'No treatment specified'}</td>
            <td>${appointment.duration || 60} min</td>
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
    
    if (appointmentId) {
        title.textContent = 'Edit Appointment';
        loadAppointmentData(appointmentId);
    } else {
        title.textContent = 'Schedule Appointment';
        document.getElementById('appointmentForm').reset();
        document.getElementById('appointment-id').value = '';
        loadTreatmentOptions();
    }
    
    modal.show();
}

async function loadTreatmentOptions() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/treatments`);
        if (response && response.ok) {
            const treatments = await response.json();
            const select = document.getElementById('appointment-treatment');
            
            // Make treatment type optional
            select.innerHTML = '<option value="">No specific treatment</option>' + 
                treatments.filter(t => t.is_active).map(treatment => 
                    `<option value="${treatment.id}">${treatment.name}</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Error loading treatments:', error);
    }
}

async function loadAppointmentData(appointmentId) {
    try {
        const response = await authenticatedFetch(`${API_BASE}/appointments/${appointmentId}`);
        if (response && response.ok) {
            const appointment = await response.json();
            
            document.getElementById('appointment-id').value = appointment.id;
            document.getElementById('appointment-patient-search').value = appointment.patient_name;
            document.getElementById('appointment-patient').value = appointment.patient_id;
            document.getElementById('appointment-date').value = appointment.appointment_date.slice(0, 16);
            document.getElementById('appointment-treatment').value = appointment.treatment_id || '';
            document.getElementById('appointment-duration').value = appointment.duration || 60;
            document.getElementById('appointment-notes').value = appointment.notes || '';
            document.getElementById('appointment-status').value = appointment.status;
            
            await loadTreatmentOptions();
            document.getElementById('appointment-treatment').value = appointment.treatment_id || '';
        }
    } catch (error) {
        console.error('Error loading appointment data:', error);
        showError('Failed to load appointment data');
    }
}

// BUG FIX #2: Fixed appointment validation - treatment type is now truly optional
async function saveAppointment() {
    const appointmentId = document.getElementById('appointment-id').value;
    const patientId = document.getElementById('appointment-patient').value;
    const appointmentDate = document.getElementById('appointment-date').value;
    
    if (!patientId || !appointmentDate) {
        showError('Patient and appointment date are required');
        return;
    }
    
    const treatmentValue = document.getElementById('appointment-treatment').value;
    
    const appointmentData = {
        patient_id: parseInt(patientId),
        appointment_date: appointmentDate,
        treatment_id: treatmentValue ? parseInt(treatmentValue) : null, // Properly handle empty treatment
        duration: parseInt(document.getElementById('appointment-duration').value) || 60,
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
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
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
            renderTreatments(treatments);
        }
    } catch (error) {
        console.error('Error loading treatments:', error);
        showError('Failed to load treatments');
    }
}

function renderTreatments(treatmentList = treatments) {
    const tbody = document.querySelector('#treatments-table tbody');
    if (!tbody) return;
    
    if (treatmentList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No treatments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = treatmentList.map(treatment => `
        <tr>
            <td>${treatment.name}</td>
            <td>${treatment.description || 'No description'}</td>
            <td>${treatment.duration || 60}</td>
            <td>$${treatment.price ? treatment.price.toFixed(2) : '0.00'}</td>
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
            document.getElementById('treatment-duration').value = treatment.duration || 60;
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
        duration: parseInt(document.getElementById('treatment-duration').value) || 60,
        price: parseFloat(document.getElementById('treatment-price').value) || 0,
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
    if (!confirm('Are you sure you want to delete this treatment?')) return;
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/treatments/${treatmentId}`, {
            method: 'DELETE'
        });
        
        if (response && response.ok) {
            loadTreatments();
            showSuccess('Treatment deleted successfully');
        } else {
            showError('Failed to delete treatment');
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
            users = await response.json();
            renderUsers(users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

function renderUsers(userList = users) {
    const tbody = document.querySelector('#users-table tbody');
    if (!tbody) return;
    
    if (userList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = userList.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})" ${user.id === currentUser.id ? 'disabled' : ''}>
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Edit User functionality
function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Populate edit user modal
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-is-active').checked = user.is_active;
    
    // Show edit user modal
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
}

async function saveUserEdit() {
    const userId = document.getElementById('edit-user-id').value;
    const userData = {
        username: document.getElementById('edit-username').value,
        email: document.getElementById('edit-email').value,
        is_active: document.getElementById('edit-is-active').checked
    };
    
    const newPassword = document.getElementById('edit-password').value;
    if (newPassword) {
        userData.password = newPassword;
    }
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
        
        if (response && response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            loadUsers();
            showSuccess('User updated successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showError('Failed to update user');
    }
}

function showAddUserModal() {
    document.getElementById('addUserForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
}

async function saveNewUser() {
    const userData = {
        username: document.getElementById('new-username').value,
        email: document.getElementById('new-email').value,
        password: document.getElementById('new-password').value
    };
    
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (userData.password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/users`, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response && response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            loadUsers();
            showSuccess('User created successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showError('Failed to create user');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
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

function showChangePasswordModal() {
    document.getElementById('changePasswordForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modal.show();
}

async function savePasswordChange() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password-change').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    
    if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
    }
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/change-password`, {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
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

// Reports functions - BUG FIX #1: Fixed report generation
async function showReportsWithData() {
    // Set default dates if not set
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    
    if (!startDateInput.value || !endDateInput.value) {
        // Set default to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        startDateInput.value = firstDay.toISOString().split('T')[0];
        endDateInput.value = lastDay.toISOString().split('T')[0];
    }
    
    // Auto-generate reports if dates are set
    if (startDateInput.value && endDateInput.value) {
        generateReports();
    }
}

// BUG FIX #1: Fixed report generation function
async function generateReports() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    try {
        // Fixed API endpoint call
        const response = await authenticatedFetch(`${API_BASE}/reports?start_date=${startDate}&end_date=${endDate}`);
        if (response && response.ok) {
            const reports = await response.json();
            displayReports(reports);
        } else {
            showError('Failed to generate reports');
        }
    } catch (error) {
        console.error('Error generating reports:', error);
        showError('Failed to generate reports');
    }
}

function displayReports(reports) {
    const container = document.getElementById('reports-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-chart-bar me-2"></i>Appointment Statistics</h5>
                    </div>
                    <div class="card-body">
                        <p><strong>Total Appointments:</strong> ${reports.total_appointments || 0}</p>
                        <p><strong>Completed:</strong> ${reports.completed_appointments || 0}</p>
                        <p><strong>Cancelled:</strong> ${reports.cancelled_appointments || 0}</p>
                        <p><strong>No Shows:</strong> ${reports.no_show_appointments || 0}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-dollar-sign me-2"></i>Revenue Information</h5>
                    </div>
                    <div class="card-body">
                        <p><strong>Total Revenue:</strong> $${reports.total_revenue ? reports.total_revenue.toFixed(2) : '0.00'}</p>
                        <p><strong>Average per Appointment:</strong> $${reports.average_revenue ? reports.average_revenue.toFixed(2) : '0.00'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showError(message) {
    // Create and show error alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

function showSuccess(message) {
    // Create and show success alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 3000);
}

