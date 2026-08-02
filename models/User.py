"""
User/Admin Model for Library Management System
"""
from database.mongodb import BaseRepository, get_current_timestamp
from bson.objectid import ObjectId
import bcrypt
import re


class User(BaseRepository):
    """User/Admin model"""
    
    def __init__(self):
        """Initialize User repository"""
        super().__init__('admins')
    
    @staticmethod
    def hash_password(password):
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    @staticmethod
    def verify_password(password, hashed_password):
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except:
            return False
    
    def create_admin(self, username, email, phone, password, full_name, profile_image=None):
        """Create new admin account"""
        try:
            # Check if username or email already exists
            if self.find_one({'username': username}):
                return {'success': False, 'message': 'Username already exists'}
            
            if self.find_one({'email': email}):
                return {'success': False, 'message': 'Email already exists'}
            
            # Hash password
            hashed_password = self.hash_password(password)
            
            # Create admin document
            admin = {
                'username': username,
                'email': email,
                'phone': phone,
                'full_name': full_name,
                'password': hashed_password,
                'profile_image': profile_image,
                'created_at': get_current_timestamp(),
                'updated_at': get_current_timestamp(),
                'last_login': None,
                'status': 'active'
            }
            
            # Insert into database
            admin_id = self.insert_one(admin)
            return {'success': True, 'message': 'Admin created successfully', 'admin_id': str(admin_id)}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def authenticate(self, username, password):
        """Authenticate user"""
        try:
            admin = self.find_one({'username': username})
            
            if not admin:
                return {'success': False, 'message': 'Invalid username or password'}
            
            if admin['status'] == 'inactive':
                return {'success': False, 'message': 'Account is inactive'}
            
            if not self.verify_password(password, admin['password']):
                return {'success': False, 'message': 'Invalid username or password'}
            
            # Update last login
            self.update_one({'_id': admin['_id']}, {
                'last_login': get_current_timestamp()
            })
            
            return {
                'success': True,
                'message': 'Login successful',
                'admin': {
                    '_id': str(admin['_id']),
                    'username': admin['username'],
                    'email': admin['email'],
                    'full_name': admin['full_name'],
                    'profile_image': admin.get('profile_image'),
                    'phone': admin.get('phone')
                }
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def get_admin(self, admin_id):
        """Get admin by ID"""
        try:
            admin = self.find_one({'_id': ObjectId(admin_id)})
            if admin:
                admin['_id'] = str(admin['_id'])
                return admin
            return None
        except:
            return None
    
    def update_admin(self, admin_id, update_data):
        """Update admin information"""
        try:
            update_data['updated_at'] = get_current_timestamp()
            return self.update_one({'_id': ObjectId(admin_id)}, update_data)
        except:
            return False
    
    def change_password(self, admin_id, old_password, new_password):
        """Change admin password"""
        try:
            admin = self.find_one({'_id': ObjectId(admin_id)})
            
            if not admin:
                return {'success': False, 'message': 'Admin not found'}
            
            if not self.verify_password(old_password, admin['password']):
                return {'success': False, 'message': 'Current password is incorrect'}
            
            hashed_password = self.hash_password(new_password)
            self.update_one({'_id': ObjectId(admin_id)}, {'password': hashed_password})
            
            return {'success': True, 'message': 'Password changed successfully'}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
