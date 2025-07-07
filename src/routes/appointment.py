from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from src.models.base import db
from src.models.appointment import Appointment
from src.models.patient import Patient

appointment_bp = Blueprint('appointment', __name__)

@appointment_bp.route('/appointments', methods=['GET'])
def get_appointments():
    date_filter = request.args.get('date')
    status_filter = request.args.get('status')
    
    query = Appointment.query
    
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Appointment.appointment_date) == filter_date)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if status_filter and status_filter != 'all':
        query = query.filter(Appointment.status == status_filter)
    
    appointments = query.order_by(Appointment.appointment_date).all()
    return jsonify([appointment.to_dict() for appointment in appointments])

@appointment_bp.route('/appointments', methods=['POST'])
def create_appointment():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['patient_id', 'appointment_date', 'treatment_type']
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
    
    appointment = Appointment(
        patient_id=data['patient_id'],
        appointment_date=appointment_date,
        duration_minutes=data.get('duration_minutes', 60),
        treatment_type=data['treatment_type'],
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

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
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
    appointment.duration_minutes = data.get('duration_minutes', appointment.duration_minutes)
    appointment.treatment_type = data.get('treatment_type', appointment.treatment_type)
    appointment.notes = data.get('notes', appointment.notes)
    appointment.status = data.get('status', appointment.status)
    
    try:
        db.session.commit()
        return jsonify(appointment.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update appointment'}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
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
def get_upcoming_appointments():
    now = datetime.now()
    appointments = Appointment.query.filter(
        Appointment.appointment_date > now,
        Appointment.status == 'scheduled'
    ).order_by(Appointment.appointment_date).limit(5).all()
    
    return jsonify([appointment.to_dict() for appointment in appointments])

@appointment_bp.route('/appointments/availability', methods=['GET'])
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
            if apt.appointment_date <= slot_time < apt.appointment_date + timedelta(minutes=apt.duration_minutes):
                conflict = True
                break
        
        if not conflict:
            available_slots.append(slot_time.strftime('%H:%M'))
    
    return jsonify({'available_slots': available_slots})

