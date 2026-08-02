"""
Validation utilities for Library Management System
"""
import re
from datetime import datetime


class Validator:
    """Validation class for input validation"""
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone number (10 digits)"""
        pattern = r'^[0-9]{10}$'
        return re.match(pattern, phone) is not None
    
    @staticmethod
    def validate_password(password):
        """Validate password strength"""
        if len(password) < 6:
            return False, 'Password must be at least 6 characters'
        
        if not re.search(r'[a-z]', password):
            return False, 'Password must contain lowercase letters'
        
        if not re.search(r'[A-Z]', password):
            return False, 'Password must contain uppercase letters'
        
        if not re.search(r'[0-9]', password):
            return False, 'Password must contain numbers'
        
        return True, 'Password is valid'
    
    @staticmethod
    def validate_isbn(isbn):
        """Validate ISBN format (10 or 13 digits)"""
        pattern = r'^(?:\d{9}[\dX]|\d{13})$'
        return re.match(pattern, isbn.replace('-', '').replace(' ', '')) is not None
    
    @staticmethod
    def validate_username(username):
        """Validate username"""
        if len(username) < 3:
            return False, 'Username must be at least 3 characters'
        
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return False, 'Username can only contain letters, numbers, and underscores'
        
        return True, 'Username is valid'
    
    @staticmethod
    def validate_required_fields(data, fields):
        """Validate required fields"""
        missing = []
        for field in fields:
            if field not in data or not data[field]:
                missing.append(field)
        
        if missing:
            return False, f'Missing required fields: {", ".join(missing)}'
        
        return True, 'All required fields present'
    
    @staticmethod
    def validate_date_format(date_string):
        """Validate date format (YYYY-MM-DD)"""
        try:
            datetime.strptime(date_string, '%Y-%m-%d')
            return True
        except ValueError:
            return False
    
    @staticmethod
    def validate_registration_data(data):
        """Validate registration form data"""
        required_fields = ['full_name', 'email', 'phone', 'username', 'password', 'confirm_password']
        
        # Check required fields
        is_valid, message = Validator.validate_required_fields(data, required_fields)
        if not is_valid:
            return False, message
        
        # Validate email
        if not Validator.validate_email(data['email']):
            return False, 'Invalid email format'
        
        # Validate phone
        if not Validator.validate_phone(data['phone']):
            return False, 'Phone number must be 10 digits'
        
        # Validate username
        is_valid, message = Validator.validate_username(data['username'])
        if not is_valid:
            return False, message
        
        # Validate password
        is_valid, message = Validator.validate_password(data['password'])
        if not is_valid:
            return False, message
        
        # Check password match
        if data['password'] != data['confirm_password']:
            return False, 'Passwords do not match'
        
        return True, 'All validations passed'
    
    @staticmethod
    def validate_book_data(data):
        """Validate book form data"""
        required_fields = ['isbn', 'title', 'author', 'publisher', 'category', 'quantity']
        
        # Check required fields
        is_valid, message = Validator.validate_required_fields(data, required_fields)
        if not is_valid:
            return False, message
        
        # Validate ISBN
        if not Validator.validate_isbn(data['isbn']):
            return False, 'Invalid ISBN format'
        
        # Validate quantity is number
        try:
            int(data['quantity'])
        except ValueError:
            return False, 'Quantity must be a number'
        
        return True, 'All validations passed'
    
    @staticmethod
    def validate_member_data(data):
        """Validate member form data"""
        required_fields = ['name', 'email', 'phone', 'membership_type']
        
        # Check required fields
        is_valid, message = Validator.validate_required_fields(data, required_fields)
        if not is_valid:
            return False, message
        
        # Validate email
        if not Validator.validate_email(data['email']):
            return False, 'Invalid email format'
        
        # Validate phone
        if not Validator.validate_phone(data['phone']):
            return False, 'Phone number must be 10 digits'
        
        return True, 'All validations passed'
    
    @staticmethod
    def sanitize_input(input_string):
        """Sanitize input to prevent injection attacks"""
        if isinstance(input_string, str):
            # Remove special characters that could be used in injection attacks
            dangerous_chars = ['<', '>', '"', "'", '&', ';']
            for char in dangerous_chars:
                input_string = input_string.replace(char, '')
        return input_string
