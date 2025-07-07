// Dental Office Management System JavaScript

// Global variables
let currentSection = 'dashboard';
let patients = [];
let appointments = [];
let treatments = [];

// API base URL
const API_BASE = '/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Patient search
    document.getElementById('patient-search').addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length > 2) {
            searchPatients(query);
        } else if (query.length === 0) {
            loadPatients();
        }
    });

    // Appointment filters
    document.getElementById('appointment-date-filter').addEventListener('change', loadAppointments);
    document.getElementById('appointment-status-filter').addEventListener('change', loadAppointments);

    // Ensure datetime-local input type for appointment date
    const appointmentDateInput = document.getElementById('appointment-date');
    if (appointmentDateInput) {
        appointmentDateInput.type = 'datetime-local';
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
    document.getElementById(sectionName + '-section').style.display = 'block';

    // Add active class to clicked nav link
    // Check if event.target exists before accessing its properties
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
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        // Load dashboard stats
        const response = await fetch(`${API_BASE}/reports/dashboard`);
        const stats = await response.json();
        
        displayDashboardStats(stats);
        
        // Load today's appointments
        const today = new Date().toISOString().split('T')[0];
        const todayResponse = await fetch(`${API_BASE}/appointments?date=${today}`);
        const todayAppointments = await todayResponse.json();
        
        displayTodayAppointments(todayAppointments);
        
        // Load upcoming appointments
        const upcomingResponse = await fetch(`${API_BASE}/appointments/upcoming`);
        const upcomingAppointments = await upcomingResponse.json();
        
        displayUpcomingAppointments(upcomingAppointments);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

function displayDashboardStats(stats) {
    const statsContainer = document.getElementById('dashboard-stats');
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

// Patient functions
async function loadPatients() {
    try {
        const response = await fetch(`${API_BASE}/patients`);
        patients = await response.json();
        displayPatients(patients);
    } catch (error) {
        console.error('Error loading patients:', error);
        showError('Failed to load patients');
    }
}

async function searchPatients(query) {
    try {
        const response = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(query)}`);
        const searchResults = await response.json();
        displayPatients(searchResults);
    } catch (error) {
        console.error('Error searching patients:', error);
        showError('Failed to search patients');
    }
}

function displayPatients(patientList) {
    const tbody = document.querySelector('#patients-table tbody');
    
    if (patientList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No patients found</td></tr>';
        return;
    }
    
    tbody.innerHTML = patientList.map(patient => `
        <tr>
            <td>${patient.first_name} ${patient.last_name}</td>
            <td>${patient.email}</td>
            <td>${patient.phone}</td>
            <td>${patient.insurance_provider || 'None'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editPatient(${patient.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePatient(${patient.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
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
        const response = await fetch(`${API_BASE}/patients/${patientId}`);
        const patient = await response.json();
        
        document.getElementById('patient-id').value = patient.id;
        document.getElementById('first-name').value = patient.first_name;
        document.getElementById('last-name').value = patient.last_name;
        document.getElementById('email').value = patient.email;
        document.getElementById('phone').value = patient.phone;
        document.getElementById('date-of-birth').value = patient.date_of_birth || '';
        document.getElementById('address').value = patient.address || '';
        document.getElementById('medical-history').value = patient.medical_history || '';
        document.getElementById('insurance-provider').value = patient.insurance_provider || '';
        document.getElementById('emergency-contact-name').value = patient.emergency_contact_name || '';
        document.getElementById('emergency-contact-phone').value = patient.emergency_contact_phone || '';
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
        medical_history: document.getElementById('medical-history').value || null,
        insurance_provider: document.getElementById('insurance-provider').value || null,
        emergency_contact_name: document.getElementById('emergency-contact-name').value || null,
        emergency_contact_phone: document.getElementById('emergency-contact-phone').value || null
    };
    
    try {
        let response;
        if (patientId) {
            response = await fetch(`${API_BASE}/patients/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            });
        } else {
            response = await fetch(`${API_BASE}/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            });
        }
        
        if (response.ok) {
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

function editPatient(patientId) {
    showPatientModal(patientId);
}

async function deletePatient(patientId) {
    if (!confirm('Are you sure you want to delete this patient? This will also delete all their appointments.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/patients/${patientId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadPatients();
            showSuccess('Patient deleted successfully');
        } else {
            showError('Failed to delete patient');
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        showError('Failed to delete patient');
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
        
        const response = await fetch(url);
        appointments = await response.json();
        displayAppointments(appointments);
    } catch (error) {
        console.error('Error loading appointments:', error);
        showError('Failed to load appointments');
    }
}

function displayAppointments(appointmentList) {
    const tbody = document.querySelector('#appointments-table tbody');
    
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
            <td><span class="badge status-${appointment.status}">${appointment.status.replace('_', ' ')}</span></td>
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

async function showAppointmentModal(appointmentId = null) {
    const modalElement = document.getElementById('appointmentModal');
    const modal = new bootstrap.Modal(modalElement);
    const title = document.getElementById('appointmentModalTitle');
    
    // Load patients and treatments for dropdowns
    await loadPatientsForDropdown();
    await loadTreatmentsForDropdown();
    
    if (appointmentId) {
        title.textContent = 'Edit Appointment';
        loadAppointmentData(appointmentId);
    } else {
        title.textContent = 'Schedule Appointment';
        document.getElementById('appointmentForm').reset();
        document.getElementById('appointment-id').value = '';
        document.getElementById('appointment-duration').value = '60';
        document.getElementById('appointment-status').value = 'scheduled';
    }
    
    modal.show();

    // Add event listener to hide the modal when the date input changes
    const appointmentDateInput = document.getElementById('appointment-date');
    if (appointmentDateInput) {
        appointmentDateInput.addEventListener('change', function() {
            // This will trigger when a date is selected from the native datetime-local picker
            // No explicit hide needed for native pickers, but if a custom one was used, this would be the place
        });
    }
}

async function loadPatientsForDropdown() {
    try {
        const response = await fetch(`${API_BASE}/patients`);
        const patients = await response.json();
        
        const select = document.getElementById('appointment-patient');
        select.innerHTML = '<option value="">Select a patient...</option>' +
            patients.map(patient => `<option value="${patient.id}">${patient.first_name} ${patient.last_name}</option>`).join('');
    } catch (error) {
        console.error('Error loading patients for dropdown:', error);
    }
}

async function loadTreatmentsForDropdown() {
    try {
        const response = await fetch(`${API_BASE}/treatments?active_only=true`);
        const treatments = await response.json();
        
        const select = document.getElementById('appointment-treatment');
        select.innerHTML = '<option value="">Select a treatment...</option>' +
            treatments.map(treatment => `<option value="${treatment.name}" data-duration="${treatment.duration_minutes}">${treatment.name}</option>`).join('');
        
        // Update duration when treatment is selected
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.dataset.duration) {
                document.getElementById('appointment-duration').value = selectedOption.dataset.duration;
            }
        });
    } catch (error) {
        console.error('Error loading treatments for dropdown:', error);
    }
}

async function loadAppointmentData(appointmentId) {
    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}`);
        const appointment = await response.json();
        
        document.getElementById('appointment-id').value = appointment.id;
        document.getElementById('appointment-patient').value = appointment.patient_id;
        document.getElementById('appointment-date').value = appointment.appointment_date.slice(0, 16);
        document.getElementById('appointment-treatment').value = appointment.treatment_type;
        document.getElementById('appointment-duration').value = appointment.duration_minutes;
        document.getElementById('appointment-notes').value = appointment.notes || '';
        document.getElementById('appointment-status').value = appointment.status;
    } catch (error) {
        console.error('Error loading appointment data:', error);
        showError('Failed to load appointment data');
    }
}

async function saveAppointment() {
    const appointmentId = document.getElementById('appointment-id').value;
    const appointmentData = {
        patient_id: parseInt(document.getElementById('appointment-patient').value),
        appointment_date: document.getElementById('appointment-date').value,
        treatment_type: document.getElementById('appointment-treatment').value,
        duration_minutes: parseInt(document.getElementById('appointment-duration').value),
        notes: document.getElementById('appointment-notes').value || null,
        status: document.getElementById('appointment-status').value
    };
    
    try {
        let response;
        if (appointmentId) {
            response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });
        } else {
            response = await fetch(`${API_BASE}/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });
        }
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('appointmentModal')).hide(); // Hide modal on success
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
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
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
        const response = await fetch(`${API_BASE}/treatments`);
        treatments = await response.json();
        displayTreatments(treatments);
    } catch (error) {
        console.error('Error loading treatments:', error);
        showError('Failed to load treatments');
    }
}

function displayTreatments(treatmentList) {
    const tbody = document.querySelector('#treatments-table tbody');
    
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
        const response = await fetch(`${API_BASE}/treatments/${treatmentId}`);
        const treatment = await response.json();
        
        document.getElementById('treatment-id').value = treatment.id;
        document.getElementById('treatment-name').value = treatment.name;
        document.getElementById('treatment-description').value = treatment.description || '';
        document.getElementById('treatment-duration').value = treatment.duration_minutes;
        document.getElementById('treatment-price').value = treatment.price || '';
        document.getElementById('treatment-active').checked = treatment.is_active;
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
            response = await fetch(`${API_BASE}/treatments/${treatmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(treatmentData)
            });
        } else {
            response = await fetch(`${API_BASE}/treatments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(treatmentData)
            });
        }
        
        if (response.ok) {
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

// Reports functions
async function generateReports() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    try {
        const [appointmentResponse, patientResponse, revenueResponse] = await Promise.all([
            fetch(`${API_BASE}/reports/appointments?start_date=${startDate}&end_date=${endDate}`),
            fetch(`${API_BASE}/reports/patients`),
            fetch(`${API_BASE}/reports/revenue?start_date=${startDate}&end_date=${endDate}`)
        ]);
        
        const appointmentData = await appointmentResponse.json();
        const patientData = await patientResponse.json();
        const revenueData = await revenueResponse.json();
        
        displayReports(appointmentData, patientData, revenueData);
    } catch (error) {
        console.error('Error generating reports:', error);
        showError('Failed to generate reports');
    }
}

function displayReports(appointmentData, patientData, revenueData) {
    const container = document.getElementById('reports-content');
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Appointments by Status</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Appointments by Treatment</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="treatmentChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Daily Appointments</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="dailyChart"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Revenue by Treatment</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create charts
    createStatusChart(appointmentData.by_status);
    createTreatmentChart(appointmentData.by_treatment);
    createDailyChart(appointmentData.daily_counts);
    createRevenueChart(revenueData.by_treatment);
}

function createStatusChart(data) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.status),
            datasets: [{
                data: data.map(item => item.count),
                backgroundColor: ['#0d6efd', '#198754', '#dc3545', '#6c757d']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function createTreatmentChart(data) {
    const ctx = document.getElementById('treatmentChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.treatment_type),
            datasets: [{
                label: 'Appointments',
                data: data.map(item => item.count),
                backgroundColor: '#0d6efd'
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
    const ctx = document.getElementById('dailyChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.date),
            datasets: [{
                label: 'Appointments',
                data: data.map(item => item.count),
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
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
    const ctx = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx, {
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

// Utility functions
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
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

// Missing Treatment functions
function editTreatment(treatmentId) {
    const treatment = treatments.find(t => t.id === treatmentId);
    if (!treatment) {
        showError('Treatment not found');
        return;
    }

    // Populate the form with treatment data
    document.getElementById('treatment-id').value = treatment.id;
    document.getElementById('treatment-name').value = treatment.name;
    document.getElementById('treatment-description').value = treatment.description || '';
    document.getElementById('treatment-duration').value = treatment.duration_minutes;
    document.getElementById('treatment-price').value = treatment.price || '';
    document.getElementById('treatment-active').checked = treatment.is_active;

    // Update modal title
    document.getElementById('treatmentModalTitle').textContent = 'Edit Treatment';

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('treatmentModal'));
    modal.show();
}

async function deleteTreatment(treatmentId) {
    if (!confirm('Are you sure you want to delete this treatment?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/treatments/${treatmentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
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

// Enhanced Reports functionality
function showReportsWithData() {
    const container = document.getElementById('reports-content');
    
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


