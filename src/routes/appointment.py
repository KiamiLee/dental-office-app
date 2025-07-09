from flask import Blueprint, request, jsonify
from flask_login import login_required
from datetime import datetime, timedelta
from src.models.base import db
from src.models.appointment import Appointment
from src.models.patient import Patient

appointment_bp = Blueprint('appointment', __name__)

@appointment_bp.route('/appointments', methods=['GET'])
@login_required
def get_appointments():
    date_filter = request.args.get('date')
    status_filter = request.args.get('status')
    patient_id_filter = request.args.get('patient_id')
    
    query = Appointment.query
    
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Appointment.appointment_date) == filter_date)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if status_filter and status_filter != 'all':
        query = query.filter(Appointment.status == status_filter)
    
    if patient_id_filter:
        query = query.filter(Appointment.patient_id == patient_id_filter)
    
    appointments = query.order_by(Appointment.appointment_date).all()
    return jsonify([appointment.to_dict() for appointment in appointments])

@appointment_bp.route('/appointments', methods=['POST'])
@login_required
def create_appointment():
    data = request.get_json()
    
    # BUG FIX: Make treatment_type optional - only patient_id and appointment_date are required
    required_fields = ['patient_id', 'appointment_date']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        appointment_date = datetime.strptime(data["appointment_date"], "%Y-%m-%dT%H:%M")
    except ValueError:
        return jsonify({'error': 'Invalid appointment_date format. Use YYYY-MM-DDTHH:MM'}), 400
    
    # Check if patient exists
    patient = Patient.query.get(data.get('patient_id'))
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    # Simplified conflict checking - just check if there's an appointment at the exact same time
    existing_appointment = Appointment.query.filter(
        Appointment.appointment_date == appointment_date,
        Appointment.status == 'scheduled'
    ).first()
    
    if existing_appointment:
        return jsonify({'error': 'Time slot is already booked'}), 409
    
    # BUG FIX: Handle optional treatment_id properly
    treatment_id = data.get('treatment_id')
    if treatment_id == '' or treatment_id == 'null':
        treatment_id = None
    
    appointment = Appointment(
        patient_id=data['patient_id'],
        appointment_date=appointment_date,
        duration=data.get('duration', 60),  # Changed from duration_minutes to duration
        treatment_id=treatment_id,  # Use treatment_id instead of treatment_type
        notes=data.get('notes'),
        status=data.get('status', 'scheduled')
    )
    
    try:
        db.session.add(appointment)
        db.session.commit()
        return jsonify(appointment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create appointment'}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['GET'])
@login_required
def get_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    return jsonify(appointment.to_dict())

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
@login_required
def update_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    data = request.get_json()
    
    # Update appointment date if provided
    if data.get('appointment_date'):
        try:
            new_date = datetime.strptime(data["appointment_date"], "%Y-%m-%dT%H:%M")
            
            # Simple conflict check for new date
            if new_date != appointment.appointment_date:
                existing_appointment = Appointment.query.filter(
                    Appointment.id != appointment_id,
                    Appointment.appointment_date == new_date,
                    Appointment.status == 'scheduled'
                ).first()
                
                if existing_appointment:
                    return jsonify({'error': 'Time slot is already booked'}), 409
            
            appointment.appointment_date = new_date
        except ValueError:
            return jsonify({'error': 'Invalid appointment_date format. Use ISO format'}), 400
    
    # Update other fields
    appointment.duration = data.get('duration', appointment.duration)
    
    # Handle optional treatment_id
    if 'treatment_id' in data:
        treatment_id = data.get('treatment_id')
        if treatment_id == '' or treatment_id == 'null':
            treatment_id = None
        appointment.treatment_id = treatment_id
    
    appointment.notes = data.get('notes', appointment.notes)
    appointment.status = data.get('status', appointment.status)
    
    try:
        db.session.commit()
        return jsonify(appointment.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update appointment'}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@login_required
def delete_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    
    try:
        db.session.delete(appointment)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete appointment'}), 500

@appointment_bp.route('/appointments/upcoming', methods=['GET'])
@login_required
def get_upcoming_appointments():
    now = datetime.now()
    appointments = Appointment.query.filter(
        Appointment.appointment_date > now,
        Appointment.status == 'scheduled'
    ).order_by(Appointment.appointment_date).limit(5).all()
    
    return jsonify([appointment.to_dict() for appointment in appointments])

@appointment_bp.route('/appointments/availability', methods=['GET'])
@login_required
def check_availability():
    date_str = request.args.get('date')
    duration = int(request.args.get('duration', 60))
    
    if not date_str:
        return jsonify({'error': 'Date parameter is required'}), 400
    
    try:
        check_date = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Get all appointments for the day
    appointments = Appointment.query.filter(
        db.func.date(Appointment.appointment_date) == check_date.date(),
        Appointment.status == 'scheduled'
    ).order_by(Appointment.appointment_date).all()
    
    # Generate available time slots (simplified)
    available_slots = []
    start_hour = 9  # 9 AM
    end_hour = 17   # 5 PM
    
    for hour in range(start_hour, end_hour):
        slot_time = check_date.replace(hour=hour, minute=0, second=0, microsecond=0)
        
        # Check if this slot conflicts with existing appointments
        conflict = False
        for apt in appointments:
            apt_duration = getattr(apt, 'duration', 60)  # Handle both duration and duration_minutes
            if apt.appointment_date <= slot_time < apt.appointment_date + timedelta(minutes=apt_duration):
                conflict = True
                break
        
        if not conflict:
            available_slots.append(slot_time.strftime('%H:%M'))
    
    return jsonify({'available_slots': available_slots})

