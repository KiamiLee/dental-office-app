from flask import Blueprint, request, jsonify
from flask_login import login_required
from src.models.patient import Patient, db
from datetime import datetime

patient_bp = Blueprint('patient', __name__)

@patient_bp.route('/patients', methods=['GET'])
@login_required
def get_patients():
    """Get all patients"""
    patients = Patient.query.all()
    return jsonify([patient.to_dict() for patient in patients])

@patient_bp.route('/patients', methods=['POST'])
@login_required
def create_patient():
    """Create a new patient"""
    data = request.json
    
    # BUG FIX: Validate required fields - email is now optional
    required_fields = ['first_name', 'last_name', 'phone']
    for field in required_fields:
        if not data.get(field) or not data.get(field).strip():
            return jsonify({'error': f'{field} is required'}), 400
    
    # Convert date_of_birth string to date object if provided
    date_of_birth = None
    if data.get('date_of_birth'):
        try:
            date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # BUG FIX: Handle optional email properly
    email = data.get('email')
    if email and not email.strip():
        email = None
    
    patient = Patient(
        first_name=data['first_name'].strip(),
        last_name=data['last_name'].strip(),
        email=email,  # Now optional
        phone=data['phone'].strip(),
        date_of_birth=date_of_birth,
        address=data.get('address'),
        medical_history=data.get('medical_history'),
        notes=data.get('notes')  # Added notes field
    )
    
    try:
        db.session.add(patient)
        db.session.commit()
        return jsonify(patient.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create patient: {str(e)}'}), 500

@patient_bp.route('/patients/<int:patient_id>', methods=['GET'])
@login_required
def get_patient(patient_id):
    """Get a specific patient"""
    patient = Patient.query.get_or_404(patient_id)
    return jsonify(patient.to_dict())

@patient_bp.route('/patients/<int:patient_id>', methods=['PUT'])
@login_required
def update_patient(patient_id):
    """Update a patient"""
    patient = Patient.query.get_or_404(patient_id)
    data = request.json
    
    # Update fields
    if data.get('first_name'):
        patient.first_name = data['first_name'].strip()
    if data.get('last_name'):
        patient.last_name = data['last_name'].strip()
    if data.get('phone'):
        patient.phone = data['phone'].strip()
    
    # Handle optional email
    if 'email' in data:
        email = data.get('email')
        if email and email.strip():
            patient.email = email.strip()
        else:
            patient.email = None
    
    patient.address = data.get('address', patient.address)
    patient.medical_history = data.get('medical_history', patient.medical_history)
    patient.notes = data.get('notes', patient.notes)  # Added notes field
    
    # Handle date_of_birth update
    if data.get('date_of_birth'):
        try:
            patient.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    try:
        db.session.commit()
        return jsonify(patient.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update patient: {str(e)}'}), 500

@patient_bp.route('/patients/<int:patient_id>', methods=['DELETE'])
@login_required
def delete_patient(patient_id):
    """Delete a patient"""
    patient = Patient.query.get_or_404(patient_id)
    
    try:
        db.session.delete(patient)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete patient'}), 500

@patient_bp.route('/patients/search', methods=['GET'])
@login_required
def search_patients():
    """Search patients by name, email, or phone"""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    
    patients = Patient.query.filter(
        db.or_(
            Patient.first_name.ilike(f'%{query}%'),
            Patient.last_name.ilike(f'%{query}%'),
            Patient.email.ilike(f'%{query}%'),
            Patient.phone.ilike(f'%{query}%')
        )
    ).all()
    
    return jsonify([patient.to_dict() for patient in patients])

