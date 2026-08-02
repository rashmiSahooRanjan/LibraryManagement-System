"""
Authentication routes for Library Management System
"""
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from models.User import User
from models.Member import Member
from utils.validation import Validator
from utils.helpers import ResponseHelper, FileHelper
import os

auth_bp = Blueprint('auth', __name__)

user_model = User()
member_model = Member()


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Register new user (Student, Teacher, or Librarian)"""
    if request.method == 'POST':
        try:
            # Form is submitted as multipart/form-data (to support profile image upload),
            # so read text fields from request.form instead of request.get_json()
            data = request.form
            role = data.get('role', '').strip().lower()
            
            # Validate role
            if role not in ('student', 'teacher', 'librarian'):
                return jsonify({'success': False, 'message': 'Please select a role (Student, Teacher, or Librarian)'}), 400
            
            # Validate common registration data
            is_valid, message = Validator.validate_registration_data(data)
            if not is_valid:
                return jsonify({'success': False, 'message': message}), 400
            
            # Check if file uploaded
            profile_image = None
            if 'profile_image' in request.files:
                file = request.files['profile_image']
                if file and FileHelper.allowed_file(file.filename):
                    profile_image = FileHelper.save_upload_file(file, 'static/images/uploads')
            
            if role == 'librarian':
                # ====== Create Librarian (Admin) account ======
                result = user_model.create_admin(
                    username=data['username'],
                    email=data['email'],
                    phone=data['phone'],
                    password=data['password'],
                    full_name=data['full_name'],
                    profile_image=profile_image
                )
                
                if not result['success']:
                    return jsonify({'success': False, 'message': result['message']}), 400
                
                # Auto-login as admin
                session['admin_id'] = result['admin_id']
                session['username'] = data['username']
                session['full_name'] = data['full_name']
                session['email'] = data['email']
                session.permanent = False
                
                return jsonify({
                    'success': True,
                    'message': 'Librarian account created successfully!',
                    'redirect': url_for('dashboard')
                }), 201
            
            else:
                # ====== Create Student or Teacher member account ======
                membership_type = 'Student' if role == 'student' else 'Teacher'
                
                result = member_model.create_member({
                    'name': data['full_name'],
                    'email': data['email'],
                    'phone': data['phone'],
                    'username': data['username'],
                    'password': data['password'],
                    'membership_type': membership_type,
                    'department': data.get('department', ''),
                    'roll_number': data.get('roll_number', ''),
                    'profile_image': profile_image
                })
                
                if not result['success']:
                    return jsonify({'success': False, 'message': result['message']}), 400
                
                # Auto-login as member
                session['member_id'] = result['member_id']
                session['member_username'] = result['username']
                session['member_name'] = data['full_name']
                session['member_email'] = data['email']
                session['member_type'] = membership_type
                session.permanent = True
                
                return jsonify({
                    'success': True,
                    'message': f'{membership_type} account created successfully! Redirecting to your dashboard...',
                    'redirect': url_for('member.dashboard')
                }), 201
        
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    return render_template('register.html')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login admin"""
    if request.method == 'POST':
        try:
            data = request.get_json()
            
            # Validate required fields
            if not data.get('username') or not data.get('password'):
                return jsonify({'success': False, 'message': 'Username and password required'}), 400
            
            # Authenticate user
            result = user_model.authenticate(data['username'], data['password'])
            
            if result['success']:
                # Set session
                session['admin_id'] = result['admin']['_id']
                session['username'] = result['admin']['username']
                session['full_name'] = result['admin']['full_name']
                session['email'] = result['admin']['email']
                session.permanent = data.get('remember_me', False)
                
                return jsonify({
                    'success': True,
                    'message': result['message'],
                    'admin': result['admin']
                }), 200
            else:
                return jsonify({'success': False, 'message': result['message']}), 401
        
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    return render_template('login.html')


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout admin"""
    try:
        session.clear()
        return jsonify({'success': True, 'message': 'Logout successful'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/verify-session', methods=['GET'])
def verify_session():
    """Verify if user is logged in"""
    if 'admin_id' in session:
        return jsonify({
            'success': True,
            'admin_id': session['admin_id'],
            'username': session.get('username'),
            'full_name': session.get('full_name'),
            'email': session.get('email')
        }), 200
    else:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Handle forgot password - basic implementation"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email or not Validator.validate_email(email):
            return jsonify({'success': False, 'message': 'Invalid email'}), 400
        
        admin = user_model.find_one({'email': email})
        
        if not admin:
            return jsonify({'success': False, 'message': 'Email not found'}), 404
        
        # In production, send reset link via email
        return jsonify({
            'success': True,
            'message': 'Password reset link sent to email'
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
