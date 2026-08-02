"""
Members routes for Library Management System
"""
from flask import Blueprint, request, jsonify, session
from models.Member import Member
from utils.validation import Validator
from utils.helpers import ResponseHelper, FileHelper
from database.mongodb import log_activity
from functools import wraps

members_bp = Blueprint('members', __name__)

member_model = Member()


def login_required(f):
    """Decorator to check if user is logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function


@members_bp.route('/members', methods=['GET'])
@login_required
def get_members():
    """Get all members"""
    try:
        page = request.args.get('page', 1, type=int)
        search_query = request.args.get('search', '', type=str)
        status = request.args.get('status', '', type=str)
        items_per_page = request.args.get('limit', 10, type=int)
        
        skip = (page - 1) * items_per_page
        
        result = member_model.get_all_members(
            skip=skip,
            limit=items_per_page,
            search_query=search_query if search_query else None,
            status=status if status else None
        )
        
        return ResponseHelper.paginated_response(
            result['members'],
            result['total'],
            page,
            items_per_page,
            'Members retrieved successfully'
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@members_bp.route('/members/<member_id>', methods=['GET'])
@login_required
def get_member(member_id):
    """Get single member"""
    try:
        member = member_model.get_member(member_id)
        
        if not member:
            return ResponseHelper.error_response('Member not found', 404)
        
        return ResponseHelper.success_response('Member retrieved successfully', member)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@members_bp.route('/members', methods=['POST'])
@login_required
def create_member():
    """Create new member"""
    try:
        # Get form data
        data = {
            'name': request.form.get('name', '').strip(),
            'email': request.form.get('email', '').strip(),
            'phone': request.form.get('phone', '').strip(),
            'gender': request.form.get('gender', 'Not Specified').strip(),
            'dob': request.form.get('dob', '').strip(),
            'address': request.form.get('address', '').strip(),
            'college': request.form.get('college', '').strip(),
            'department': request.form.get('department', '').strip(),
            'roll_number': request.form.get('roll_number', '').strip(),
            'membership_type': request.form.get('membership_type', 'Student').strip(),
            'username': request.form.get('username', '').strip(),
            'password': request.form.get('password', '').strip()
        }
        
        # Validate data
        is_valid, message = Validator.validate_member_data(data)
        if not is_valid:
            return ResponseHelper.error_response(message, 400)
        
        # Handle file upload
        if 'profile_image' in request.files:
            file = request.files['profile_image']
            if file and FileHelper.allowed_file(file.filename):
                filename = FileHelper.save_upload_file(file, 'static/images/uploads')
                if filename:
                    data['profile_image'] = filename
        
        # Create member
        result = member_model.create_member(data)
        
        if result['success']:
            log_activity(session.get('admin_id'), 'create_member', f"Member '{data['name']}' added")
            return ResponseHelper.success_response(result['message'], {
                'member_id': result['member_id'],
                'username': result.get('username'),
                'password': result.get('password')
            }, 201)
        else:
            return ResponseHelper.error_response(result['message'], 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@members_bp.route('/members/<member_id>', methods=['PUT'])
@login_required
def update_member(member_id):
    """Update member"""
    try:
        update_data = {}
        
        # Get form data
        fields = ['name', 'email', 'phone', 'gender', 'dob', 'address', 'college', 
                  'department', 'roll_number', 'membership_type', 'status',
                  'username', 'password']
        
        for field in fields:
            value = request.form.get(field)
            if value:
                update_data[field] = value
        
        # Handle file upload
        if 'profile_image' in request.files:
            file = request.files['profile_image']
            if file and FileHelper.allowed_file(file.filename):
                filename = FileHelper.save_upload_file(file, 'static/images/uploads')
                if filename:
                    update_data['profile_image'] = filename
        
        # Update member
        result = member_model.update_member(member_id, update_data)
        
        # The model can return a dict (error message) or a boolean (success/fail)
        if isinstance(result, dict):
            return ResponseHelper.error_response(result.get('message', 'Failed to update member'), 400)
        
        if result:
            log_activity(session.get('admin_id'), 'update_member', f"Member {member_id} updated")
            return ResponseHelper.success_response('Member updated successfully')
        else:
            return ResponseHelper.error_response('Failed to update member', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@members_bp.route('/members/<member_id>', methods=['DELETE'])
@login_required
def delete_member(member_id):
    """Delete member"""
    try:
        if member_model.delete_member(member_id):
            log_activity(session.get('admin_id'), 'delete_member', f"Member {member_id} deleted")
            return ResponseHelper.success_response('Member deleted successfully')
        else:
            return ResponseHelper.error_response('Failed to delete member', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@members_bp.route('/members/search/<search_type>', methods=['GET'])
@login_required
def search_members(search_type):
    """Search members"""
    try:
        search_value = request.args.get('query', '').strip()
        page = request.args.get('page', 1, type=int)
        items_per_page = 10
        
        skip = (page - 1) * items_per_page
        
        result = member_model.search_members(search_type, search_value, skip=skip, limit=items_per_page)
        
        return ResponseHelper.paginated_response(
            result['members'],
            result['total'],
            page,
            items_per_page,
            'Search results'
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@members_bp.route('/members/status/<status>', methods=['GET'])
@login_required
def get_members_by_status(status):
    """Get members by status"""
    try:
        page = request.args.get('page', 1, type=int)
        items_per_page = 10
        
        skip = (page - 1) * items_per_page
        
        result = member_model.get_members_by_status(status, skip=skip, limit=items_per_page)
        
        return ResponseHelper.paginated_response(
            result['members'],
            result['total'],
            page,
            items_per_page,
            f'Members with status: {status}'
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@members_bp.route('/statistics', methods=['GET'])
@login_required
def get_statistics():
    """Get member statistics"""
    try:
        stats = member_model.get_statistics()
        return ResponseHelper.success_response('Statistics retrieved successfully', stats)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)
