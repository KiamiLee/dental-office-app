from datetime import datetime
from src.models.base import db

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patient.id"), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    treatment_type = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="scheduled")  # scheduled, completed, cancelled, no_show
    reminder_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Appointment {self.id} - {self.treatment_type or 'No Treatment'}>"

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "patient_name": self.patient.full_name() if self.patient else None,
            "appointment_date": self.appointment_date.isoformat() if self.appointment_date else None,
            "treatment_type": self.treatment_type or '',
            "notes": self.notes,
            "status": self.status,
            "reminder_sent": self.reminder_sent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

