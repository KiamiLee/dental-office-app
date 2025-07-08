from flask import Blueprint, jsonify, request, render_template_string
from flask_login import login_user, logout_user, login_required, current_user
from src.models.user import User
from src.models.base import db

user_bp = Blueprint('user', __name__)

@user_bp.route('/login', methods=['GET'])
def login_page():
    """Serve the login page."""
    login_html = '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - Dental Office Management</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .login-card {
                background: white;
                border-radius: 15px;
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                max-width: 400px;
                width: 100%;
            }
            .login-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2rem;
                text-align: center;
            }
            .login-body {
                padding: 2rem;
            }
            .btn-login {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 25px;
                padding: 12px 30px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .form-control {
                border-radius: 25px;
                padding: 12px 20px;
                border: 2px solid #e9ecef;
                transition: all 0.3s ease;
            }
            .form-control:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
            }
            .alert {
                border-radius: 10px;
            }
        </style>
    </head>
    <body>
        <div class="login-card">
            <div class="login-header">
                <i class="fas fa-tooth fa-3x mb-3"></i>
                <h3>Dental Office Management</h3>
                <p class="mb-0">Please sign in to continue</p>
            </div>
            <div class="login-body">
                <div id="error-message" class="alert alert-danger d-none"></div>
                <form id="loginForm">
                    <div class="mb-3">
                        <div class="input-group">
                            <span class="input-group-text bg-transparent border-end-0">
                                <i class="fas fa-user text-muted"></i>
                            </span>
                            <input type="text" class="form-control border-start-0" id="username" 
                                   placeholder="Username" required>
                        </div>
                    </div>
                    <div class="mb-4">
                        <div class="input-group">
                            <span class="input-group-text bg-transparent border-end-0">
                                <i class="fas fa-lock text-muted"></i>
                            </span>
                            <input type="password" class="form-control border-start-0" id="password" 
                                   placeholder="Password" required>
                        </div>
                    </div>
                    <div class="mb-3 form-check">
                        <input type="checkbox" class="form-check-input" id="remember">
                        <label class="form-check-label" for="remember">Remember me</label>
                    </div>
                    <button type="submit" class="btn btn-primary btn-login w-100">
                        <i class="fas fa-sign-in-alt me-2"></i>Sign In
                    </button>
                </form>
            </div>
        </div>

        <script>
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const remember = document.getElementById('remember').checked;
                const errorDiv = document.getElementById('error-message');
                
                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username: username,
                            password: password,
                            remember: remember
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        window.location.href = '/';
                    } else {
                        errorDiv.textContent = data.error || 'Login failed';
                        errorDiv.classList.remove('d-none');
                    }
                } catch (error) {
                    errorDiv.textContent = 'Network error. Please try again.';
                    errorDiv.classList.remove('d-none');
                }
            });
        </script>
    </body>
    </html>
    '''
    return render_template_string(login_html)

@user_bp.route('/login', methods=['POST'])
def login():
    """Handle login requests."""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']) and user.is_active:
        remember = data.get('remember', False)
        login_user(user, remember=remember)
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        }), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@user_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Handle logout requests."""
    logout_user()
    return jsonify({'message': 'Logout successful'}), 200

@user_bp.route('/current-user', methods=['GET'])
@login_required
def get_current_user():
    """Get current logged-in user information."""
    return jsonify(current_user.to_dict()), 200

@user_bp.route('/setup', methods=['POST'])
def setup_admin():
    """Create the first admin user if no users exist."""
    if User.query.count() > 0:
        return jsonify({'error': 'Admin user already exists'}), 400
    
    data = request.get_json()
    
    if not data or not all(k in data for k in ['username', 'email', 'password']):
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400
    
    admin = User.create_admin_user(
        username=data['username'],
        email=data['email'],
        password=data['password']
    )
    
    if admin:
        return jsonify({
            'message': 'Admin user created successfully',
            'user': admin.to_dict()
        }), 201
    else:
        return jsonify({'error': 'Failed to create admin user'}), 500

# Protected user management routes
@user_bp.route('/users', methods=['GET'])
@login_required
def get_users():
    """Get all users"""
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/users', methods=['POST'])
@login_required
def create_user():
    """Create a new user"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ['username', 'email', 'password']):
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400
    
    # Check if username or email already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    try:
        user = User(
            username=data['username'],
            email=data['email']
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create user'}), 500

@user_bp.route('/users/<int:user_id>', methods=['GET'])
@login_required
def get_user(user_id):
    """Get a specific user"""
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    """Update a user"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    try:
        # Check if username or email already exists (excluding current user)
        if data.get('username') and data['username'] != user.username:
            if User.query.filter_by(username=data['username']).first():
                return jsonify({'error': 'Username already exists'}), 400
            user.username = data['username']
        
        if data.get('email') and data['email'] != user.email:
            if User.query.filter_by(email=data['email']).first():
                return jsonify({'error': 'Email already exists'}), 400
            user.email = data['email']
        
        if 'is_active' in data:
            user.is_active = data['is_active']
        
        if data.get('password'):
            if len(data['password']) < 6:
                return jsonify({'error': 'Password must be at least 6 characters long'}), 400
            user.set_password(data['password'])
        
        db.session.commit()
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update user'}), 500

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    """Delete a user"""
    if User.query.count() <= 1:
        return jsonify({'error': 'Cannot delete the last user'}), 400
    
    if current_user.id == user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    user = User.query.get_or_404(user_id)
    
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete user'}), 500

@user_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change current user's password"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ['current_password', 'new_password']):
        return jsonify({'error': 'Current password and new password are required'}), 400
    
    if not current_user.check_password(data['current_password']):
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    if len(data['new_password']) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long'}), 400
    
    try:
        current_user.set_password(data['new_password'])
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to change password'}), 500

