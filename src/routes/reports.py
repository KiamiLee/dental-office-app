from flask import Blueprint, request, jsonify
from flask_login import login_required
from src.models.appointment import Appointment, db
from src.models.patient import Patient
from src.models.treatment import Treatment
from datetime import datetime, timedelta
from sqlalchemy import func, extract

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/reports/dashboard', methods=['GET'])
@login_required
def get_dashboard_stats():
    """Get dashboard statistics"""
    today = datetime.now().date()
    
    # Today's appointments
    today_appointments = Appointment.query.filter(
        func.date(Appointment.appointment_date) == today
    ).count()
    
    # This week's appointments
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    week_appointments = Appointment.query.filter(
        func.date(Appointment.appointment_date) >= week_start,
        func.date(Appointment.appointment_date) <= week_end
    ).count()
    
    # Total patients
    total_patients = Patient.query.count()
    
    # New patients this month
    month_start = today.replace(day=1)
    new_patients_this_month = Patient.query.filter(
        func.date(Patient.created_at) >= month_start
    ).count()
    
    # Upcoming appointments (next 7 days)
    next_week = today + timedelta(days=7)
    upcoming_appointments = Appointment.query.filter(
        func.date(Appointment.appointment_date) > today,
        func.date(Appointment.appointment_date) <= next_week,
        Appointment.status == 'scheduled'
    ).count()
    
    return jsonify({
        'today_appointments': today_appointments,
        'week_appointments': week_appointments,
        'total_patients': total_patients,
        'new_patients_this_month': new_patients_this_month,
        'upcoming_appointments': upcoming_appointments
    })

# BUG FIX: Add unified reports endpoint that frontend expects
@reports_bp.route('/reports', methods=['GET'])
@login_required
def get_unified_reports():
    """Get unified reports for the specified date range"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'start_date and end_date parameters are required'}), 400
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Get appointment statistics
    total_appointments = Appointment.query.filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date
    ).count()
    
    completed_appointments = Appointment.query.filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date,
        Appointment.status == 'completed'
    ).count()
    
    cancelled_appointments = Appointment.query.filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date,
        Appointment.status == 'cancelled'
    ).count()
    
    no_show_appointments = Appointment.query.filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date,
        Appointment.status == 'no_show'
    ).count()
    
    # Calculate revenue (simplified - based on completed appointments)
    # This is a basic calculation - you might want to enhance this based on your treatment pricing
    total_revenue = completed_appointments * 100  # Placeholder calculation
    average_revenue = total_revenue / completed_appointments if completed_appointments > 0 else 0
    
    return jsonify({
        'total_appointments': total_appointments,
        'completed_appointments': completed_appointments,
        'cancelled_appointments': cancelled_appointments,
        'no_show_appointments': no_show_appointments,
        'total_revenue': total_revenue,
        'average_revenue': average_revenue
    })

@reports_bp.route('/reports/appointments', methods=['GET'])
@login_required
def get_appointment_reports():
    """Get appointment statistics for a date range"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'start_date and end_date parameters are required'}), 400
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Appointments by status
    appointments_by_status = db.session.query(
        Appointment.status,
        func.count(Appointment.id).label('count')
    ).filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date
    ).group_by(Appointment.status).all()
    
    # Appointments by treatment type (handle both treatment_id and treatment_type)
    appointments_by_treatment = db.session.query(
        func.coalesce(Treatment.name, 'No Treatment').label('treatment_name'),
        func.count(Appointment.id).label('count')
    ).outerjoin(
        Treatment, Appointment.treatment_id == Treatment.id
    ).filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date
    ).group_by(Treatment.name).all()
    
    # Daily appointment counts
    daily_counts = db.session.query(
        func.date(Appointment.appointment_date).label('date'),
        func.count(Appointment.id).label('count')
    ).filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date
    ).group_by(func.date(Appointment.appointment_date)).order_by('date').all()
    
    return jsonify({
        'by_status': [{'status': status, 'count': count} for status, count in appointments_by_status],
        'by_treatment': [{'treatment_type': treatment, 'count': count} for treatment, count in appointments_by_treatment],
        'daily_counts': [{'date': date.isoformat(), 'count': count} for date, count in daily_counts]
    })

@reports_bp.route('/reports/patients', methods=['GET'])
@login_required
def get_patient_reports():
    """Get patient statistics"""
    # New patients by month (last 12 months)
    twelve_months_ago = datetime.now().date().replace(day=1) - timedelta(days=365)
    
    monthly_new_patients = db.session.query(
        extract('year', Patient.created_at).label('year'),
        extract('month', Patient.created_at).label('month'),
        func.count(Patient.id).label('count')
    ).filter(
        func.date(Patient.created_at) >= twelve_months_ago
    ).group_by(
        extract('year', Patient.created_at),
        extract('month', Patient.created_at)
    ).order_by('year', 'month').all()
    
    # Patients by insurance provider (if the field exists)
    try:
        patients_by_insurance = db.session.query(
            func.coalesce(Patient.insurance_provider, 'No Insurance').label('insurance_provider'),
            func.count(Patient.id).label('count')
        ).group_by(Patient.insurance_provider).all()
    except:
        # If insurance_provider field doesn't exist, return empty data
        patients_by_insurance = []
    
    return jsonify({
        'monthly_new_patients': [
            {
                'year': int(year),
                'month': int(month),
                'count': count
            } for year, month, count in monthly_new_patients
        ],
        'by_insurance': [
            {
                'insurance_provider': provider or 'No Insurance',
                'count': count
            } for provider, count in patients_by_insurance
        ]
    })

@reports_bp.route('/reports/revenue', methods=['GET'])
@login_required
def get_revenue_reports():
    """Get revenue statistics (based on completed appointments and treatment prices)"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'start_date and end_date parameters are required'}), 400
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Revenue by treatment type (for completed appointments)
    revenue_by_treatment = db.session.query(
        func.coalesce(Treatment.name, 'No Treatment').label('treatment_name'),
        func.count(Appointment.id).label('appointment_count'),
        func.coalesce(func.sum(Treatment.price), 0).label('total_revenue')
    ).outerjoin(
        Treatment, Appointment.treatment_id == Treatment.id
    ).filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date,
        Appointment.status == 'completed'
    ).group_by(Treatment.name).all()
    
    # Daily revenue
    daily_revenue = db.session.query(
        func.date(Appointment.appointment_date).label('date'),
        func.count(Appointment.id).label('appointment_count'),
        func.coalesce(func.sum(Treatment.price), 0).label('revenue')
    ).outerjoin(
        Treatment, Appointment.treatment_id == Treatment.id
    ).filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date,
        Appointment.status == 'completed'
    ).group_by(func.date(Appointment.appointment_date)).order_by('date').all()
    
    return jsonify({
        'by_treatment': [
            {
                'treatment_type': treatment,
                'appointment_count': count,
                'total_revenue': float(revenue) if revenue else 0
            } for treatment, count, revenue in revenue_by_treatment
        ],
        'daily_revenue': [
            {
                'date': date.isoformat(),
                'appointment_count': count,
                'revenue': float(revenue) if revenue else 0
            } for date, count, revenue in daily_revenue
        ]
    })

