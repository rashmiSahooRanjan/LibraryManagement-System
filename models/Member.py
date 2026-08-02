"""
Member Model for Library Management System
"""
from database.mongodb import BaseRepository, get_current_timestamp
from bson.objectid import ObjectId
import bcrypt
import uuid


class Member(BaseRepository):
    """Member model"""
    
    DEFAULT_PASSWORD = 'Member@123'
    
    def __init__(self):
        """Initialize Member repository"""
        super().__init__('members')
    
    def generate_member_id(self):
        """Generate unique member ID"""
        return 'MEM' + str(uuid.uuid4().hex[:8]).upper()
    
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
    
    def create_member(self, member_data):
        """Create new member"""
        try:
            # Check if email already exists
            if self.find_one({'email': member_data['email']}):
                return {'success': False, 'message': 'Email already exists'}
            
            # Check if username already exists (if provided)
            username = member_data.get('username', '').strip()
            if username:
                if self.find_one({'username': username}):
                    return {'success': False, 'message': 'Username already exists'}
            else:
                # Auto-generate username from email prefix
                username = member_data['email'].split('@')[0]
                base_username = username
                counter = 1
                while self.find_one({'username': username}):
                    username = f"{base_username}{counter}"
                    counter += 1
            
            # Hash password (use provided or default)
            password = member_data.get('password', '') or self.DEFAULT_PASSWORD
            hashed_password = self.hash_password(password)
            
            # Prepare member document
            member = {
                'member_id': self.generate_member_id(),
                'username': username,
                'password': hashed_password,
                'name': member_data['name'],
                'gender': member_data.get('gender', 'Not Specified'),
                'dob': member_data.get('dob'),
                'phone': member_data['phone'],
                'email': member_data['email'],
                'address': member_data.get('address', ''),
                'college': member_data.get('college', ''),
                'department': member_data.get('department', ''),
                'roll_number': member_data.get('roll_number', ''),
                'membership_type': member_data.get('membership_type', 'Student'),
                'profile_image': member_data.get('profile_image'),
                'status': 'active',
                'joining_date': get_current_timestamp(),
                'created_at': get_current_timestamp(),
                'updated_at': get_current_timestamp()
            }
            
            # Insert into database
            member_id = self.insert_one(member)
            return {
                'success': True,
                'message': 'Member created successfully',
                'member_id': str(member_id),
                'username': username,
                'password': password if member_data.get('password') else None
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def authenticate_member(self, identifier, password):
        """Authenticate a member by username or email"""
        try:
            member = self.find_one({
                '$or': [
                    {'username': identifier},
                    {'email': identifier}
                ]
            })
            
            if not member:
                return {'success': False, 'message': 'Invalid username or password'}
            
            if member['status'] != 'active':
                return {'success': False, 'message': 'Your account is not active. Contact the library admin.'}
            
            # Verify password against hashed password
            hashed = member.get('password')
            if not hashed:
                # Legacy member without password set - allow default password fallback
                hashed = self.hash_password(self.DEFAULT_PASSWORD)
                # Store the hashed default so future logins work consistently
                self.update_one({'_id': member['_id']}, {'password': hashed})
            
            if not self.verify_password(password, hashed):
                return {'success': False, 'message': 'Invalid username or password'}
            
            # Update last login
            self.update_one({'_id': member['_id']}, {
                'last_login': get_current_timestamp()
            })
            
            return {
                'success': True,
                'message': 'Login successful',
                'member': {
                    '_id': str(member['_id']),
                    'member_id': member['member_id'],
                    'username': member['username'],
                    'name': member['name'],
                    'email': member['email'],
                    'phone': member.get('phone'),
                    'membership_type': member.get('membership_type', 'Student'),
                    'profile_image': member.get('profile_image'),
                    'department': member.get('department', ''),
                    'roll_number': member.get('roll_number', '')
                }
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def get_member_by_username(self, username):
        """Get member by username"""
        return self.find_one({'username': username})
    
    def get_member_by_email(self, email):
        """Get member by email"""
        return self.find_one({'email': email})
    
    def get_member(self, member_id):
        """Get member by ID"""
        try:
            member = self.find_one({'_id': ObjectId(member_id)})
            if member:
                member['_id'] = str(member['_id'])
                return member
            return None
        except:
            return None
    
    def get_all_members(self, skip=0, limit=10, search_query=None, status=None):
        """Get all members with pagination and filtering"""
        query = {}
        
        if search_query:
            query['$or'] = [
                {'name': {'$regex': search_query, '$options': 'i'}},
                {'email': search_query},
                {'member_id': search_query}
            ]
        
        if status:
            query['status'] = status
        
        members = self.find_many(query, skip=skip, limit=limit)
        total = self.count(query)
        
        for member in members:
            member['_id'] = str(member['_id'])
        
        return {'members': members, 'total': total}
    
    def update_member(self, member_id, update_data):
        """Update member information"""
        try:
            # Hash password if being updated
            if update_data.get('password'):
                update_data['password'] = self.hash_password(update_data['password'])
            
            # Check username uniqueness if updating username
            if update_data.get('username'):
                existing = self.find_one({
                    'username': update_data['username'],
                    '_id': {'$ne': ObjectId(member_id)}
                })
                if existing:
                    return {'success': False, 'message': 'Username already exists'}
            
            update_data['updated_at'] = get_current_timestamp()
            return self.update_one({'_id': ObjectId(member_id)}, update_data)
        except:
            return False
    
    def delete_member(self, member_id):
        """Delete member"""
        try:
            return self.delete_one({'_id': ObjectId(member_id)})
        except:
            return False
    
    def search_members(self, search_type, search_value, skip=0, limit=10):
        """Search members by various fields"""
        query = {}
        
        if search_type == 'name':
            query['name'] = {'$regex': search_value, '$options': 'i'}
        elif search_type == 'email':
            query['email'] = search_value
        elif search_type == 'member_id':
            query['member_id'] = search_value
        elif search_type == 'phone':
            query['phone'] = search_value
        
        members = self.find_many(query, skip=skip, limit=limit)
        total = self.count(query)
        
        for member in members:
            member['_id'] = str(member['_id'])
        
        return {'members': members, 'total': total}
    
    def get_members_by_status(self, status, skip=0, limit=10):
        """Get members by status"""
        members = self.find_many({'status': status}, skip=skip, limit=limit)
        total = self.count({'status': status})
        
        for member in members:
            member['_id'] = str(member['_id'])
        
        return {'members': members, 'total': total}
    
    def get_statistics(self):
        """Get member statistics"""
        try:
            return {
                'total_members': self.count({}),
                'active_members': self.count({'status': 'active'}),
                'inactive_members': self.count({'status': 'inactive'}),
                'blocked_members': self.count({'status': 'blocked'})
            }
        except:
            return {
                'total_members': 0,
                'active_members': 0,
                'inactive_members': 0,
                'blocked_members': 0
            }
