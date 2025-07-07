import os
import sys
# DON\'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, request
from flask_cors import CORS
from src.models.base import db
from src.models.patient import Patient
from src.models.appointment import Appointment
from src.models.treatment import Treatment
from src.routes.user import user_bp
from src.routes.patient import patient_bp
from src.routes.appointment import appointment_bp
from src.routes.treatment import treatment_bp
from src.routes.reports import reports_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app)

# Register blueprints (API routes should be registered before catch-all static file route)
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(patient_bp, url_prefix='/api')
app.register_blueprint(appointment_bp, url_prefix='/api')
app.register_blueprint(treatment_bp, url_prefix='/api')
app.register_blueprint(reports_bp, url_prefix='/api')

# Database configuration
import os
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Use external database (PostgreSQL, etc.)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    print("✅ Using external database from DATABASE_URL")
else:
    # Use SQLite as default
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
    print("📁 Using SQLite database")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()

# Catch-all route for serving static files (should be after API routes)
@app.route('/', defaults={'path': ''}) 
@app.route('/<path:path>')
def serve(path):
    if path.startswith('api/'):
        # If the request is for an API endpoint, let the blueprints handle it
        # This route should not handle API requests, so we return a 404 or let it pass
        from werkzeug.exceptions import NotFound
        raise NotFound()

    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)


