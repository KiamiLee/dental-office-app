import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, request, redirect, url_for
from flask_cors import CORS
from flask_login import LoginManager, login_required, current_user
from flask_bcrypt import Bcrypt
from src.models.base import db
from src.models.user import User
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

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'user.login_page'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

# Initialize Bcrypt
bcrypt = Bcrypt(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Enable CORS for all routes
CORS(app, supports_credentials=True)

# Register blueprints (API routes should be registered before catch-all static file route)
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(patient_bp, url_prefix='/api')
app.register_blueprint(appointment_bp, url_prefix='/api')
app.register_blueprint(treatment_bp, url_prefix='/api')
app.register_blueprint(reports_bp, url_prefix='/api')

# Database configuration
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

# Create database tables and setup admin user
with app.app_context():
    db.create_all()
    
    # Create default admin user if no users exist
    if User.query.count() == 0:
        admin = User(username='admin', email='admin@dentaloffice.com')
        admin.set_password('admin123')  # Default password - should be changed
        db.session.add(admin)
        db.session.commit()
        print("🔑 Default admin user created: username='admin', password='admin123'")
        print("⚠️  Please change the default password after first login!")

# Authentication check for main application
@app.before_request
def require_login():
    # Allow access to login page and API login/setup endpoints
    allowed_endpoints = [
        'user.login_page', 
        'user.login', 
        'user.setup_admin',
        'static'
    ]
    
    # Allow access to static files
    if request.endpoint in allowed_endpoints or request.path.startswith('/static/'):
        return
    
    # Check if user is authenticated for all other routes
    if not current_user.is_authenticated:
        if request.path.startswith('/api/'):
            return {'error': 'Authentication required'}, 401
        else:
            return redirect(url_for('user.login_page'))

# Catch-all route for serving static files (should be after API routes)
@app.route('/', defaults={'path': ''}) 
@app.route('/<path:path>')
@login_required
def serve_static_files(path):
    static_folder_path = app.static_folder
    
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

