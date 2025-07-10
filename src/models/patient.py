from datetime import datetime
from src.models.base import db

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=True)  # FIXED: Made nullable and removed unique constraint
    phone = db.Column(db.String(20), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=True)
    address = db.Column(db.Text, nullable=True)
    medical_history = db.Column(db.Text, nullable=True)
    
    # Legacy fields for backward compatibility (all nullable)
    insurance_provider = db.Column(db.String(100), nullable=True)
    insurance_id = db.Column(db.String(50), nullable=True)
    emergency_contact_name = db.Column(db.String(100), nullable=True)
    emergency_contact_phone = db.Column(db.String(20), nullable=True)
    
    notes = db.Column(db.Text, nullable=True)  # Added notes field
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship with appointments
    appointments = db.relationship("Appointment", backref="patient", lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Patient {self.first_name} {self.last_name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "address": self.address,
            "medical_history": self.medical_history,
            "insurance_provider": self.insurance_provider,
            "insurance_id": self.insurance_id,
            "emergency_contact_name": self.emergency_contact_name,
            "emergency_contact_phone": self.emergency_contact_phone,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def full_name(self):
        return f"{self.first_name} {self.last_name}"

