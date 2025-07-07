# Dental Office Management System

A comprehensive web application for managing a single dentist office, built with Flask and modern web technologies.

## Features

### 🏥 **Core Functionality**
- **Patient Management** - Add, edit, search, and manage patient records
- **Appointment Scheduling** - Book, reschedule, and track appointments
- **Treatment Management** - Define services with pricing and duration
- **Dashboard Analytics** - Real-time statistics and insights

### 📊 **Reports & Analytics**
- **Dashboard Statistics** - Today's appointments, weekly trends, patient counts
- **Appointment Reports** - Status breakdown, treatment analysis, daily counts
- **Patient Reports** - Monthly growth, insurance distribution
- **Revenue Reports** - Treatment profitability, daily revenue tracking

### 🎨 **User Interface**
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI** - Bootstrap 5 with custom styling
- **Interactive Charts** - Chart.js visualizations
- **Intuitive Navigation** - Easy-to-use interface

## Technology Stack

- **Backend**: Flask (Python)
- **Database**: PostgreSQL (with SQLite fallback)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Charts**: Chart.js
- **ORM**: SQLAlchemy

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL (optional, SQLite fallback available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dental-office-app.git
   cd dental-office-app
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up database (optional)**
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

4. **Run the application**
   ```bash
   cd src
   python main.py
   ```

5. **Open in browser**
   ```
   http://localhost:5000
   ```

## Deployment

### Render Deployment

1. **Create PostgreSQL database** on Render
2. **Create web service** connected to this repository
3. **Set environment variable**: `DATABASE_URL` with your PostgreSQL connection string
4. **Deploy** automatically from GitHub

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (optional, defaults to SQLite)

## API Endpoints

### Patients
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create new patient
- `PUT /api/patients/<id>` - Update patient
- `DELETE /api/patients/<id>` - Delete patient

### Appointments
- `GET /api/appointments` - List all appointments
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/<id>` - Update appointment
- `DELETE /api/appointments/<id>` - Delete appointment

### Treatments
- `GET /api/treatments` - List all treatments
- `POST /api/treatments` - Create new treatment
- `PUT /api/treatments/<id>` - Update treatment
- `DELETE /api/treatments/<id>` - Delete treatment

### Reports
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/appointments` - Appointment reports
- `GET /api/reports/patients` - Patient reports
- `GET /api/reports/revenue` - Revenue reports

## Database Schema

### Patient
- Personal information (name, email, phone, address)
- Medical history and notes
- Insurance information
- Emergency contact details

### Appointment
- Date and time scheduling
- Patient and treatment linking
- Status tracking (scheduled, completed, cancelled, no-show)
- Notes and comments

### Treatment
- Service definitions
- Pricing and duration
- Description and details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support and questions, please open an issue on GitHub.

---

**Built for single dentist offices to streamline patient management and appointment scheduling.**

