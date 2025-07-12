from flask import Blueprint, request, jsonify
from flask_login import login_required
from src.models.treatment import Treatment
from src.models.base import db
from datetime import datetime

treatment_bp = Blueprint('treatment', __name__)

@treatment_bp.route('/treatments', methods=['GET'])
@login_required
def get_treatments():
    """Get all treatments with optional active filter"""
    try:
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        
        query = Treatment.query
        if active_only:
            query = query.filter(Treatment.is_active == True)
        
        treatments = query.order_by(Treatment.name).all()
        
        result = []
        for treatment in treatments:
            result.append({
                'id': treatment.id,
                'name': treatment.name,
                'description': treatment.description,
                'price': float(treatment.price) if treatment.price else None,
                'is_active': treatment.is_active,
                'created_at': treatment.created_at.isoformat() if treatment.created_at else None,
                'updated_at': treatment.updated_at.isoformat() if treatment.updated_at else None
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error getting treatments: {str(e)}")
        return jsonify({'error': 'Failed to retrieve treatments'}), 500

@treatment_bp.route('/treatments/<int:treatment_id>', methods=['GET'])
@login_required
def get_treatment(treatment_id):
    """Get a specific treatment"""
    try:
        treatment = Treatment.query.get(treatment_id)
        if not treatment:
            return jsonify({'error': 'Treatment not found'}), 404
        
        result = {
            'id': treatment.id,
            'name': treatment.name,
            'description': treatment.description,
            'price': float(treatment.price) if treatment.price else None,
            'is_active': treatment.is_active,
            'created_at': treatment.created_at.isoformat() if treatment.created_at else None,
            'updated_at': treatment.updated_at.isoformat() if treatment.updated_at else None
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error getting treatment {treatment_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve treatment'}), 500

@treatment_bp.route('/treatments', methods=['POST'])
@login_required
def create_treatment():
    """Create a new treatment (DURATION REMOVED)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Treatment name is required'}), 400
        
        # Check if treatment name already exists
        existing_treatment = Treatment.query.filter_by(name=data['name']).first()
        if existing_treatment:
            return jsonify({'error': 'Treatment with this name already exists'}), 400
        
        # Create new treatment (NO DURATION FIELD)
        treatment = Treatment(
            name=data['name'],
            description=data.get('description'),
            price=data.get('price'),
            is_active=data.get('is_active', True),
            created_at=datetime.utcnow()
        )
        
        db.session.add(treatment)
        db.session.commit()
        
        return jsonify({
            'id': treatment.id,
            'message': 'Treatment created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating treatment: {str(e)}")
        return jsonify({'error': 'Failed to create treatment'}), 500

@treatment_bp.route('/treatments/<int:treatment_id>', methods=['PUT'])
@login_required
def update_treatment(treatment_id):
    """Update an existing treatment (DURATION REMOVED)"""
    try:
        treatment = Treatment.query.get(treatment_id)
        if not treatment:
            return jsonify({'error': 'Treatment not found'}), 404
        
        data = request.get_json()
        
        # Check if new name conflicts with existing treatment
        if 'name' in data and data['name'] != treatment.name:
            existing_treatment = Treatment.query.filter_by(name=data['name']).first()
            if existing_treatment:
                return jsonify({'error': 'Treatment with this name already exists'}), 400
        
        # Update fields (NO DURATION FIELD)
        if 'name' in data:
            treatment.name = data['name']
        if 'description' in data:
            treatment.description = data['description']
        if 'price' in data:
            treatment.price = data['price']
        if 'is_active' in data:
            treatment.is_active = data['is_active']
        
        treatment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Treatment updated successfully'})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating treatment {treatment_id}: {str(e)}")
        return jsonify({'error': 'Failed to update treatment'}), 500

@treatment_bp.route('/treatments/<int:treatment_id>', methods=['DELETE'])
@login_required
def delete_treatment(treatment_id):
    """Delete a treatment"""
    try:
        treatment = Treatment.query.get(treatment_id)
        if not treatment:
            return jsonify({'error': 'Treatment not found'}), 404
        
        # Check if treatment is used in any appointments
        from src.models.appointment import Appointment
        appointments_count = Appointment.query.filter_by(treatment_type=treatment.name).count()
        
        if appointments_count > 0:
            return jsonify({
                'error': f'Cannot delete treatment. It is used in {appointments_count} appointment(s). Consider deactivating it instead.'
            }), 400
        
        db.session.delete(treatment)
        db.session.commit()
        
        return jsonify({'message': 'Treatment deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting treatment {treatment_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete treatment'}), 500

