from flask import Blueprint, request, jsonify
from flask_login import login_required
from src.models.appointment import Appointment, db
from src.models.patient import Patient
from datetime import datetime

appointment_bp = Blueprint('appointment', __name__)

@appointment_bp.route('/appointments', methods=['GET'])
@login_required
def get_appointments():
    """Get all appointments with optional filters"""
    try:
        # Get query parameters
        date_filter = request.args.get('date')
        status_filter = request.args.get('status')
        patient_id_filter = request.args.get('patient_id')
        
        # Start with base query
        query = db.session.query(
            Appointment.id,
            Appointment.appointment_date,
            Appointment.treatment_type,
            Appointment.notes,
            Appointment.status,
            Appointment.patient_id,
            Patient.first_name,
            Patient.last_name
        ).join(Patient, Appointment.patient_id == Patient.id)
        
        # Apply filters
        if date_filter:
            try:
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                query = query.filter(db.func.date(Appointment.appointment_date) == filter_date)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        if status_filter:
            query = query.filter(Appointment.status == status_filter)
            
        if patient_id_filter:
            try:
                patient_id = int(patient_id_filter)
                query = query.filter(Appointment.patient_id == patient_id)
            except ValueError:
                return jsonify({'error': 'Invalid patient_id'}), 400
        
        # Execute query and format results
        appointments = query.order_by(Appointment.appointment_date.desc()).all()
        
        result = []
        for apt in appointments:
            result.append({
                'id': apt.id,
                'appointment_date': apt.appointment_date.isoformat(),
                'treatment_type': apt.treatment_type,
                'notes': apt.notes,
                'status': apt.status,
                'patient_id': apt.patient_id,
                'patient_name': f"{apt.first_name} {apt.last_name}"
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error getting appointments: {str(e)}")
        return jsonify({'error': 'Failed to retrieve appointments'}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['GET'])
@login_required
def get_appointment(appointment_id):
    """Get a specific appointment"""
    try:
        appointment = db.session.query(
            Appointment.id,
            Appointment.appointment_date,
            Appointment.treatment_type,
            Appointment.notes,
            Appointment.status,
            Appointment.patient_id,
            Patient.first_name,
            Patient.last_name
        ).join(Patient, Appointment.patient_id == Patient.id).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        result = {
            'id': appointment.id,
            'appointment_date': appointment.appointment_date.isoformat(),
            'treatment_type': appointment.treatment_type,
            'notes': appointment.notes,
            'status': appointment.status,
            'patient_id': appointment.patient_id,
            'patient_name': f"{appointment.first_name} {appointment.last_name}"
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error getting appointment {appointment_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve appointment'}), 500

@appointment_bp.route('/appointments', methods=['POST'])
@login_required
def create_appointment():
    """Create a new appointment (DURATION REMOVED)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patient_id', 'appointment_date']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate patient exists
        patient = Patient.query.get(data['patient_id'])
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Parse appointment date
        try:
            appointment_date = datetime.fromisoformat(data['appointment_date'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid appointment_date format'}), 400
        
        # Create new appointment (NO DURATION FIELD)
        appointment = Appointment(
            patient_id=data['patient_id'],
            appointment_date=appointment_date,
            treatment_type=data.get('treatment_type'),
            notes=data.get('notes'),
            status=data.get('status', 'scheduled')
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'id': appointment.id,
            'message': 'Appointment created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating appointment: {str(e)}")
        return jsonify({'error': 'Failed to create appointment'}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
@login_required
def update_appointment(appointment_id):
    """Update an existing appointment (DURATION REMOVED)"""
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        data = request.get_json()
        
        # Validate patient if provided
        if 'patient_id' in data:
            patient = Patient.query.get(data['patient_id'])
            if not patient:
                return jsonify({'error': 'Patient not found'}), 404
            appointment.patient_id = data['patient_id']
        
        # Update appointment date if provided
        if 'appointment_date' in data:
            try:
                appointment.appointment_date = datetime.fromisoformat(data['appointment_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid appointment_date format'}), 400
        
        # Update other fields (NO DURATION FIELD)
        if 'treatment_type' in data:
            appointment.treatment_type = data['treatment_type']
        if 'notes' in data:
            appointment.notes = data['notes']
        if 'status' in data:
            appointment.status = data['status']
        
        db.session.commit()
        
        return jsonify({'message': 'Appointment updated successfully'})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating appointment {appointment_id}: {str(e)}")
        return jsonify({'error': 'Failed to update appointment'}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@login_required
def delete_appointment(appointment_id):
    """Delete an appointment"""
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        db.session.delete(appointment)
        db.session.commit()
        
        return jsonify({'message': 'Appointment deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting appointment {appointment_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete appointment'}), 500

@appointment_bp.route('/appointments/upcoming', methods=['GET'])
@login_required
def get_upcoming_appointments():
    """Get upcoming appointments (next 7 days)"""
    try:
        from datetime import timedelta
        
        today = datetime.now().date()
        next_week = today + timedelta(days=7)
        
        appointments = db.session.query(
            Appointment.id,
            Appointment.appointment_date,
            Appointment.treatment_type,
            Appointment.status,
            Patient.first_name,
            Patient.last_name
        ).join(Patient, Appointment.patient_id == Patient.id).filter(
            db.func.date(Appointment.appointment_date) > today,
            db.func.date(Appointment.appointment_date) <= next_week,
            Appointment.status == 'scheduled'
        ).order_by(Appointment.appointment_date).all()
        
        result = []
        for apt in appointments:
            result.append({
                'id': apt.id,
                'appointment_date': apt.appointment_date.isoformat(),
                'treatment_type': apt.treatment_type,
                'status': apt.status,
                'patient_name': f"{apt.first_name} {apt.last_name}"
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error getting upcoming appointments: {str(e)}")
        return jsonify({'error': 'Failed to retrieve upcoming appointments'}), 500

