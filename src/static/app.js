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

// FIXED Dashboard functions with robust error handling
async function loadDashboard() {
    try {
        console.log('Loading dashboard...');
        
        // Load basic stats first - use simple counts
        await loadDashboardStats();
        
        // Load today's appointments
        const today = new Date().toISOString().split('T')[0];
        console.log('Loading today appointments for:', today);
        
        const todayResponse = await authenticatedFetch(`${API_BASE}/appointments?date=${today}`);
        if (todayResponse && todayResponse.ok) {
            const todayAppointments = await todayResponse.json();
            console.log('Today appointments loaded:', todayAppointments);
            displayTodayAppointments(todayAppointments);
        } else {
            console.error('Failed to load today appointments');
            displayTodayAppointments([]);
        }
        
        // Load all appointments and filter for upcoming
        console.log('Loading all appointments...');
        const allAppointmentsResponse = await authenticatedFetch(`${API_BASE}/appointments`);
        if (allAppointmentsResponse && allAppointmentsResponse.ok) {
            const allAppointments = await allAppointmentsResponse.json();
            console.log('All appointments loaded:', allAppointments);
            displayUpcomingAppointments(allAppointments);
        } else {
            console.error('Failed to load all appointments');
            displayUpcomingAppointments([]);
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Don't show error alert, just log it and show empty states
        displayTodayAppointments([]);
        displayUpcomingAppointments([]);
        displayDashboardStats({
            today_appointments: 0,
            upcoming_appointments: 0,
            total_patients: 0
        });
    }
}

// Simple dashboard stats loading with fallback
async function loadDashboardStats() {
    try {
        console.log('Loading dashboard stats...');
        
        // Try the dashboard endpoint first
        const response = await authenticatedFetch(`${API_BASE}/reports/dashboard`);
        if (response && response.ok) {
            const stats = await response.json();
            console.log('Dashboard stats loaded:', stats);
            displayDashboardStats(stats);
            return;
        }
        
        console.log('Dashboard endpoint failed, calculating manually...');
        
        // Fallback: Calculate stats manually
        const [patientsResponse, appointmentsResponse] = await Promise.all([
            authenticatedFetch(`${API_BASE}/patients`),
            authenticatedFetch(`${API_BASE}/appointments`)
        ]);
        
        let totalPatients = 0;
        let todayAppointments = 0;
        let upcomingAppointments = 0;
        
        if (patientsResponse && patientsResponse.ok) {
            const patients = await patientsResponse.json();
            totalPatients = patients.length;
        }
        
        if (appointmentsResponse && appointmentsResponse.ok) {
            const appointments = await appointmentsResponse.json();
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            
            todayAppointments = appointments.filter(apt => 
                apt.appointment_date.startsWith(today)
            ).length;
            
            upcomingAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.appointment_date);
                return aptDate > now;
            }).length;
        }
        
        const manualStats = {
            today_appointments: todayAppointments,
            upcoming_appointments: upcomingAppointments,
            total_patients: totalPatients
        };
        
        console.log('Manual stats calculated:', manualStats);
        displayDashboardStats(manualStats);
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Show default stats
        displayDashboardStats({
            today_appointments: 0,
            upcoming_appointments: 0,
            total_patients: 0
        });
    }
}

function displayDashboardStats(stats) {
    const statsContainer = document.getElementById('dashboard-stats');
    if (!statsContainer) {
        console.error('dashboard-stats container not found');
        return;
    }
    
    console.log('Displaying dashboard stats:', stats);
    
    try {
        statsContainer.innerHTML = `
            <div class="col-md-3">
                <div class="stat-card">
                    <h3>${stats.today_appointments || 0}</h3>
                    <p><i class="fas fa-calendar-day me-1"></i>Today's Appointments</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card success">
                    <h3>${stats.upcoming_appointments || 0}</h3>
                    <p><i class="fas fa-clock me-1"></i>Upcoming Appointments</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card warning" onclick="showSection('patients')" style="cursor: pointer;">
                    <h3>${stats.total_patients || 0}</h3>
                    <p><i class="fas fa-users me-1"></i>Total Patients</p>
                </div>
            </div>
        `;
        
        console.log('Dashboard stats displayed successfully');
        
    } catch (error) {
        console.error('Error displaying dashboard stats:', error);
        statsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading dashboard statistics
                </div>
            </div>
        `;
    }
}

function displayTodayAppointments(appointments) {
    const container = document.getElementById('today-appointments');
    if (!container) {
        console.error('today-appointments container not found');
        return;
    }
    
    console.log('Displaying today appointments:', appointments);
    
    try {
        if (appointments.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No appointments today</p></div>';
            return;
        }
        
        container.innerHTML = appointments.map(appointment => `
            <div class="appointment-item ${appointment.status || 'scheduled'}">
                <div class="appointment-time">${formatTime(appointment.appointment_date)}</div>
                <div class="appointment-patient">${appointment.patient_name || 'Unknown Patient'}</div>
                <div class="appointment-treatment">${appointment.treatment_type || 'No treatment specified'}</div>
            </div>
        `).join('');
        
        console.log('Today appointments displayed successfully');
        
    } catch (error) {
        console.error('Error displaying today appointments:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading today appointments</p></div>';
    }
}

function displayUpcomingAppointments(appointments) {
    const container = document.getElementById('upcoming-appointments');
    if (!container) {
        console.error('upcoming-appointments container not found');
        return;
    }
    
    console.log('Displaying upcoming appointments:', appointments);
    
    try {
        // Get current date and time
        const now = new Date();
        console.log('Current time:', now);
        
        // Filter to show all future appointments
        const futureAppointments = appointments.filter(appointment => {
            const appointmentDate = new Date(appointment.appointment_date);
            const isFuture = appointmentDate > now;
            console.log(`Appointment ${appointment.id}: ${appointmentDate} > ${now} = ${isFuture}`);
            return isFuture;
        });
        
        console.log('Future appointments filtered:', futureAppointments);
        
        if (futureAppointments.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-plus"></i><p>No upcoming appointments</p></div>';
            return;
        }
        
        // Sort by date and take first 5
        futureAppointments.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
        
        container.innerHTML = futureAppointments.slice(0, 5).map(appointment => `
            <div class="appointment-item">
                <div class="appointment-time">${formatDateTime(appointment.appointment_date)}</div>
                <div class="appointment-patient">${appointment.patient_name || 'Unknown Patient'}</div>
                <div class="appointment-treatment">${appointment.treatment_type || 'No treatment specified'}</div>
            </div>
        `).join('');
        
        console.log('Upcoming appointments displayed successfully');
        
    } catch (error) {
        console.error('Error displaying upcoming appointments:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading upcoming appointments</p></div>';
    }
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
                        <p class="mb-0 text-muted small"><i class="fas fa-envelope me-1"></i>${patient.email || 'No email'}</p>
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
        (patient.email && patient.email.toLowerCase().includes(query.toLowerCase()))
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
    // Load patient's appointments (both past and future)
    try {
        const response = await authenticatedFetch(`${API_BASE}/appointments?patient_id=${patient.id}`);
        let allAppointments = [];
        if (response && response.ok) {
            allAppointments = await response.json();
        }
        
        // Update the existing patient detail modal
        document.getElementById('patient-name-display').innerHTML = `<strong>${patient.first_name} ${patient.last_name}</strong>`;
        document.getElementById('patient-phone-display').textContent = patient.phone;
        document.getElementById('patient-email-display').textContent = patient.email || 'Not provided';
        document.getElementById('patient-address-display').textContent = patient.address || 'Not provided';
        document.getElementById('patient-medical-history').value = patient.medical_history || '';
        
        // Update appointments (both past and future)
        const appointmentsTable = document.getElementById('patient-appointments-history');
        if (allAppointments.length > 0) {
            appointmentsTable.innerHTML = allAppointments.map((apt, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${formatDate(apt.appointment_date)}</td>
                    <td>${apt.treatment_type || 'N/A'}</td>
                    <td><span class="badge status-${apt.status}">${apt.status}</span></td>
                </tr>
            `).join('');
        } else {
            appointmentsTable.innerHTML = '<tr><td colspan="4" class="text-center">No appointments</td></tr>';
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
            document.getElementById('email').value = patient.email || '';
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
        email: document.getElementById('email').value || null,
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

// Clear patient search filter
function clearPatientFilter() {
    document.getElementById('patient-search').value = '';
    renderPatientCards(patients);
}

// Appointment functions (DURATION REMOVED)
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

function renderAppointments(appointmentList) {
    const tbody = document.querySelector('#appointments-table tbody');
    if (!tbody) return;
    
    if (appointmentList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No appointments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = appointmentList.map(appointment => `
        <tr>
            <td>${formatDateTime(appointment.appointment_date)}</td>
            <td>${appointment.patient_name}</td>
            <td>${appointment.treatment_type || 'No treatment specified'}</td>
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
                    treatments.map(treatment => `<option value="${treatment.name}">${treatment.name}</option>`).join('');
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

// Clear appointment filters
function clearAppointmentFilters() {
    document.getElementById('appointment-date-filter').value = '';
    document.getElementById('appointment-status-filter').value = '';
    loadAppointments();
}

// Treatment functions (DURATION REMOVED)
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

function renderTreatments(treatmentList) {
    const tbody = document.querySelector('#treatments-table tbody');
    if (!tbody) return;
    
    if (treatmentList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No treatments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = treatmentList.map(treatment => `
        <tr>
            <td>${treatment.name}</td>
            <td>${treatment.description || '-'}</td>
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
            // Clear form completely before closing modal
            document.getElementById('treatmentForm').reset();
            document.getElementById('treatment-id').value = '';
            
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
    try {
        const response = await authenticatedFetch(`${API_BASE}/users/${userId}`);
        if (response && response.ok) {
            const user = await response.json();
            showEditUserModal(user);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('Failed to load user data');
    }
}

function showEditUserModal(user) {
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-email').value = user.email;
    modal.show();
}

async function saveEditUser() {
    const userId = document.getElementById('edit-user-id').value;
    const userData = {
        username: document.getElementById('edit-username').value,
        email: document.getElementById('edit-email').value
    };
    
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

// FIXED Reports functions with unified endpoint
async function generateReports() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    try {
        console.log('Generating reports for:', startDate, 'to', endDate);
        
        // Use the FIXED unified reports endpoint
        const response = await authenticatedFetch(`${API_BASE}/reports?start_date=${startDate}&end_date=${endDate}`);
        
        if (!response) {
            showError('Failed to connect to reports service');
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            showError(errorData.error || 'Failed to generate reports');
            return;
        }
        
        const reportData = await response.json();
        console.log('Reports data received:', reportData);
        
        // Validate data structure
        if (!reportData.appointments || !reportData.revenue) {
            showError('Invalid report data format received');
            return;
        }
        
        displayReports(reportData.appointments, reportData.revenue);
        
    } catch (error) {
        console.error('Error generating reports:', error);
        showError('Failed to generate reports: ' + error.message);
    }
}

function displayReports(appointmentData, revenueData) {
    const container = document.getElementById('reports-content');
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    console.log('Displaying reports with data:', { appointmentData, revenueData });
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        container.innerHTML = `
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle me-2"></i>Chart Library Missing</h5>
                <p>Chart.js library is not loaded. Charts cannot be displayed.</p>
                <p>Please ensure Chart.js is included in your HTML file.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-chart-pie me-2"></i>Appointments by Status</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="statusChart" width="400" height="300"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-chart-bar me-2"></i>Appointments by Treatment</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="treatmentChart" width="400" height="300"></canvas>
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
                        <canvas id="dailyChart" width="400" height="300"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-dollar-sign me-2"></i>Revenue by Treatment</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="revenueChart" width="400" height="300"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create charts with delay to ensure DOM elements exist
    setTimeout(() => {
        try {
            createStatusChart(appointmentData.by_status || []);
            createTreatmentChart(appointmentData.by_treatment || []);
            createDailyChart(appointmentData.daily_counts || []);
            createRevenueChart(revenueData.by_treatment || []);
        } catch (error) {
            console.error('Error creating charts:', error);
            container.innerHTML += `
                <div class="alert alert-warning mt-3">
                    <h5><i class="fas fa-exclamation-triangle me-2"></i>Chart Error</h5>
                    <p>Some charts could not be created: ${error.message}</p>
                </div>
            `;
        }
    }, 100);
}

function createStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) {
        console.error('Status chart canvas not found');
        return;
    }
    
    console.log('Creating status chart with data:', data);
    
    if (!data || data.length === 0) {
        ctx.getContext('2d').fillText('No data available', 50, 50);
        return;
    }
    
    try {
        new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.status || 'Unknown'),
                datasets: [{
                    data: data.map(item => item.count || 0),
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating status chart:', error);
    }
}

function createTreatmentChart(data) {
    const ctx = document.getElementById('treatmentChart');
    if (!ctx) {
        console.error('Treatment chart canvas not found');
        return;
    }
    
    console.log('Creating treatment chart with data:', data);
    
    if (!data || data.length === 0) {
        ctx.getContext('2d').fillText('No data available', 50, 50);
        return;
    }
    
    try {
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: data.map(item => item.treatment_type || 'No Treatment'),
                datasets: [{
                    label: 'Appointments',
                    data: data.map(item => item.count || 0),
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
    } catch (error) {
        console.error('Error creating treatment chart:', error);
    }
}

function createDailyChart(data) {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) {
        console.error('Daily chart canvas not found');
        return;
    }
    
    console.log('Creating daily chart with data:', data);
    
    if (!data || data.length === 0) {
        ctx.getContext('2d').fillText('No data available', 50, 50);
        return;
    }
    
    try {
        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: data.map(item => item.date || 'Unknown'),
                datasets: [{
                    label: 'Daily Appointments',
                    data: data.map(item => item.count || 0),
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
    } catch (error) {
        console.error('Error creating daily chart:', error);
    }
}

function createRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) {
        console.error('Revenue chart canvas not found');
        return;
    }
    
    console.log('Creating revenue chart with data:', data);
    
    if (!data || data.length === 0) {
        ctx.getContext('2d').fillText('No data available', 50, 50);
        return;
    }
    
    try {
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: data.map(item => item.treatment_type || 'No Treatment'),
                datasets: [{
                    label: 'Revenue ($)',
                    data: data.map(item => item.total_revenue || 0),
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
    } catch (error) {
        console.error('Error creating revenue chart:', error);
    }
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
            <div class="mt-3">
                <small class="text-muted">
                    <strong>Note:</strong> Charts require Chart.js library to be loaded. 
                    If charts don't appear, please check that Chart.js is included in your HTML file.
                </small>
            </div>
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

