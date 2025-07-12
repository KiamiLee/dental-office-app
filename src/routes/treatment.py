from flask import Blueprint, request, jsonify
from flask_login import login_required
from src.models.treatment import Treatment, db

treatment_bp = Blueprint('treatment', __name__)

@treatment_bp.route('/treatments', methods=['GET'])
@login_required
def get_treatments():
    """Get all treatments"""
    active_only = request.args.get('active_only', 'false').lower() == 'true'
    
    query = Treatment.query
    if active_only:
        query = query.filter(Treatment.is_active == True)
    
    treatments = query.order_by(Treatment.name).all()
    return jsonify([treatment.to_dict() for treatment in treatments])

@treatment_bp.route('/treatments', methods=['POST'])
@login_required
def create_treatment():
    """Create a new treatment"""
    data = request.json
    
    treatment = Treatment(
        name=data['name'],
        description=data.get('description'),
        price=data.get('price'),
        is_active=data.get('is_active', True)
    )
    
    try:
        db.session.add(treatment)
        db.session.commit()
        return jsonify(treatment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create treatment'}), 500

@treatment_bp.route('/treatments/<int:treatment_id>', methods=['GET'])
@login_required
def get_treatment(treatment_id):
    """Get a specific treatment"""
    treatment = Treatment.query.get_or_404(treatment_id)
    return jsonify(treatment.to_dict())

@treatment_bp.route('/treatments/<int:treatment_id>', methods=['PUT'])
@login_required
def update_treatment(treatment_id):
    """Update a treatment"""
    treatment = Treatment.query.get_or_404(treatment_id)
    data = request.json
    
    treatment.name = data.get('name', treatment.name)
    treatment.description = data.get('description', treatment.description)
    treatment.price = data.get('price', treatment.price)
    treatment.is_active = data.get('is_active', treatment.is_active)
    
    try:
        db.session.commit()
        return jsonify(treatment.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update treatment'}), 500

@treatment_bp.route('/treatments/<int:treatment_id>', methods=['DELETE'])
@login_required
def delete_treatment(treatment_id):
    """Delete a treatment"""
    treatment = Treatment.query.get_or_404(treatment_id)
    
    try:
        db.session.delete(treatment)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete treatment'}), 500

