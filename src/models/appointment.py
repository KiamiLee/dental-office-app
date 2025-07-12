from datetime import datetime
from src.models.base import db

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    treatment_type = db.Column(db.String(100))
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='scheduled')  # scheduled, completed, cancelled, no-show
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    patient = db.relationship('Patient', backref=db.backref('appointments', lazy=True))
    
    def __repr__(self):
        return f'<Appointment {self.id} - {self.patient_id} on {self.appointment_date}>'
    
    def to_dict(self):
        """Convert appointment to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'appointment_date': self.appointment_date.isoformat(),
            'treatment_type': self.treatment_type,
            'notes': self.notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

