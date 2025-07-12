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
    
    # Total patients
    total_patients = Patient.query.count()
    
    # Upcoming appointments (next 7 days)
    next_week = today + timedelta(days=7)
    upcoming_appointments = Appointment.query.filter(
        func.date(Appointment.appointment_date) > today,
        func.date(Appointment.appointment_date) <= next_week
    ).count()
    
    return jsonify({
        'today_appointments': today_appointments,
        'total_patients': total_patients,
        'upcoming_appointments': upcoming_appointments
    })

@reports_bp.route('/reports', methods=['GET'])
@login_required
def get_unified_reports():
    """Get unified reports data for charts - FIXED ENDPOINT"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'start_date and end_date parameters are required'}), 400
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    try:
        # APPOINTMENTS DATA
        # Appointments by status
        appointments_by_status = db.session.query(
            Appointment.status,
            func.count(Appointment.id).label('count')
        ).filter(
            func.date(Appointment.appointment_date) >= start_date,
            func.date(Appointment.appointment_date) <= end_date
        ).group_by(Appointment.status).all()
        
        # Appointments by treatment type
        appointments_by_treatment = db.session.query(
            Appointment.treatment_type,
            func.count(Appointment.id).label('count')
        ).filter(
            func.date(Appointment.appointment_date) >= start_date,
            func.date(Appointment.appointment_date) <= end_date,
            Appointment.treatment_type.isnot(None),
            Appointment.treatment_type != ''
        ).group_by(Appointment.treatment_type).all()
        
        # Daily appointment counts
        daily_counts = db.session.query(
            func.date(Appointment.appointment_date).label('date'),
            func.count(Appointment.id).label('count')
        ).filter(
            func.date(Appointment.appointment_date) >= start_date,
            func.date(Appointment.appointment_date) <= end_date
        ).group_by(func.date(Appointment.appointment_date)).order_by('date').all()
        
        # REVENUE DATA (Simplified)
        # Revenue by treatment type (for all appointments, not just completed)
        revenue_by_treatment = db.session.query(
            Appointment.treatment_type,
            func.count(Appointment.id).label('appointment_count'),
            func.coalesce(func.sum(Treatment.price), 0).label('total_revenue')
        ).outerjoin(
            Treatment, Appointment.treatment_type == Treatment.name
        ).filter(
            func.date(Appointment.appointment_date) >= start_date,
            func.date(Appointment.appointment_date) <= end_date,
            Appointment.treatment_type.isnot(None),
            Appointment.treatment_type != ''
        ).group_by(Appointment.treatment_type).all()
        
        # Build response in expected format
        response_data = {
            'appointments': {
                'by_status': [{'status': status or 'Unknown', 'count': count} for status, count in appointments_by_status],
                'by_treatment': [{'treatment_type': treatment or 'No Treatment', 'count': count} for treatment, count in appointments_by_treatment],
                'daily_counts': [{'date': date.isoformat(), 'count': count} for date, count in daily_counts]
            },
            'revenue': {
                'by_treatment': [
                    {
                        'treatment_type': treatment or 'No Treatment',
                        'appointment_count': count,
                        'total_revenue': float(revenue) if revenue else 0
                    } for treatment, count, revenue in revenue_by_treatment
                ]
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        # Log the error and return a safe response
        print(f"Error in unified reports: {str(e)}")
        return jsonify({
            'appointments': {
                'by_status': [],
                'by_treatment': [],
                'daily_counts': []
            },
            'revenue': {
                'by_treatment': []
            }
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
    
    # Appointments by treatment type
    appointments_by_treatment = db.session.query(
        Appointment.treatment_type,
        func.count(Appointment.id).label('count')
    ).filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date
    ).group_by(Appointment.treatment_type).all()
    
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

@reports_bp.route('/reports/revenue', methods=['GET'])
@login_required
def get_revenue_reports():
    """Get revenue statistics (simplified version)"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'start_date and end_date parameters are required'}), 400
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Revenue by treatment type (simplified - all appointments)
    revenue_by_treatment = db.session.query(
        Appointment.treatment_type,
        func.count(Appointment.id).label('appointment_count'),
        func.coalesce(func.sum(Treatment.price), 0).label('total_revenue')
    ).outerjoin(
        Treatment, Appointment.treatment_type == Treatment.name
    ).filter(
        func.date(Appointment.appointment_date) >= start_date,
        func.date(Appointment.appointment_date) <= end_date
    ).group_by(Appointment.treatment_type).all()
    
    return jsonify({
        'by_treatment': [
            {
                'treatment_type': treatment or 'No Treatment',
                'appointment_count': count,
                'total_revenue': float(revenue) if revenue else 0
            } for treatment, count, revenue in revenue_by_treatment
        ]
    })

