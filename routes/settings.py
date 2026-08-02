"""
Settings and Reports routes for Library Management System
"""
from flask import Blueprint, request, jsonify, session, send_file
from database.mongodb import mongo, log_activity
from models.User import User
from models.Book import Book
from models.Member import Member
from models.Issue import Issue
from utils.helpers import ResponseHelper, FileHelper
from functools import wraps
from datetime import datetime
from io import BytesIO
import csv

settings_bp = Blueprint('settings', __name__)

user_model = User()
book_model = Book()
member_model = Member()
issue_model = Issue()


def login_required(f):
    """Decorator to check if user is logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function


# ============== SETTINGS ROUTES ==============

@settings_bp.route('/settings', methods=['GET'])
@login_required
def get_settings():
    """Get library settings"""
    try:
        settings = mongo.db.settings.find_one() or {
            'library_name': 'Smart Library',
            'logo': '',
            'address': '',
            'working_hours': '9 AM - 5 PM',
            'max_books': 5,
            'max_issue_days': 14,
            'fine_per_day': 5
        }
        
        if '_id' in settings:
            settings['_id'] = str(settings['_id'])
        
        return ResponseHelper.success_response('Settings retrieved successfully', settings)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/settings', methods=['PUT'])
@login_required
def update_settings():
    """Update library settings"""
    try:
        data = request.get_json()
        
        settings_data = {
            'library_name': data.get('library_name', 'Smart Library'),
            'address': data.get('address', ''),
            'working_hours': data.get('working_hours', '9 AM - 5 PM'),
            'max_books': data.get('max_books', 5),
            'max_issue_days': data.get('max_issue_days', 14),
            'fine_per_day': data.get('fine_per_day', 5),
            'updated_at': datetime.now()
        }
        
        # Update or insert settings
        result = mongo.db.settings.update_one(
            {},
            {'$set': settings_data},
            upsert=True
        )
        
        return ResponseHelper.success_response('Settings updated successfully')
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/settings/logo', methods=['POST'])
@login_required
def upload_logo():
    """Upload library logo"""
    try:
        if 'logo' not in request.files:
            return ResponseHelper.error_response('No file provided', 400)
        
        file = request.files['logo']
        if file and FileHelper.allowed_file(file.filename):
            filename = FileHelper.save_upload_file(file, 'static/images/uploads')
            if filename:
                mongo.db.settings.update_one(
                    {},
                    {'$set': {'logo': filename}},
                    upsert=True
                )
                return ResponseHelper.success_response('Logo uploaded successfully', {'filename': filename})
        
        return ResponseHelper.error_response('Invalid file', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """Get admin profile"""
    try:
        admin = user_model.get_admin(session['admin_id'])
        
        if not admin:
            return ResponseHelper.error_response('Admin not found', 404)
        
        return ResponseHelper.success_response('Profile retrieved successfully', admin)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update admin profile"""
    try:
        # Handle both JSON and multipart/form-data
        data = request.get_json() if request.is_json else request.form
        
        update_data = {}
        
        if data:
            if 'full_name' in data:
                update_data['full_name'] = data['full_name']
            
            if 'email' in data:
                update_data['email'] = data['email']
            
            if 'phone' in data:
                update_data['phone'] = data['phone']
        
        # Handle file upload
        if 'profile_image' in request.files:
            file = request.files['profile_image']
            if file and FileHelper.allowed_file(file.filename):
                filename = FileHelper.save_upload_file(file, 'static/images/uploads')
                if filename:
                    update_data['profile_image'] = filename
        
        if not update_data:
            return ResponseHelper.error_response('No data to update', 400)
        
        if user_model.update_admin(session['admin_id'], update_data):
            log_activity(session.get('admin_id'), 'update_profile', 'Profile updated')
            return ResponseHelper.success_response('Profile updated successfully')
        else:
            return ResponseHelper.error_response('Failed to update profile', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change admin password"""
    try:
        data = request.get_json()
        
        result = user_model.change_password(
            session['admin_id'],
            data.get('old_password'),
            data.get('new_password')
        )
        
        if result['success']:
            return ResponseHelper.success_response(result['message'])
        else:
            return ResponseHelper.error_response(result['message'], 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


# ============== REPORTS ROUTES ==============

@settings_bp.route('/reports/books', methods=['GET'])
@login_required
def get_book_report():
    """Get book report"""
    try:
        page = request.args.get('page', 1, type=int)
        items_per_page = 100
        skip = (page - 1) * items_per_page
        
        result = book_model.get_all_books(skip=skip, limit=items_per_page)
        
        report_data = {
            'title': 'Book Report',
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_books': result['total'],
            'books': result['books']
        }
        
        return ResponseHelper.success_response('Book report generated successfully', report_data)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/reports/members', methods=['GET'])
@login_required
def get_member_report():
    """Get member report"""
    try:
        page = request.args.get('page', 1, type=int)
        items_per_page = 100
        skip = (page - 1) * items_per_page
        
        result = member_model.get_all_members(skip=skip, limit=items_per_page)
        
        report_data = {
            'title': 'Member Report',
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_members': result['total'],
            'members': result['members']
        }
        
        return ResponseHelper.success_response('Member report generated successfully', report_data)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/reports/issues', methods=['GET'])
@login_required
def get_issue_report():
    """Get issue report"""
    try:
        page = request.args.get('page', 1, type=int)
        items_per_page = 100
        skip = (page - 1) * items_per_page
        
        result = issue_model.get_issued_books(skip=skip, limit=items_per_page)
        
        report_data = {
            'title': 'Issue Report',
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_issues': result['total'],
            'issues': result['issues']
        }
        
        return ResponseHelper.success_response('Issue report generated successfully', report_data)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/reports/export/csv', methods=['GET'])
@login_required
def export_csv_report():
    """Export report as CSV"""
    try:
        report_type = request.args.get('type', 'books')
        
        if report_type == 'books':
            result = book_model.get_all_books(skip=0, limit=10000)
            books = result['books']
            
            output = BytesIO()
            csv_writer = csv.DictWriter(output, fieldnames=[
                '_id', 'book_id', 'isbn', 'title', 'author', 'publisher',
                'category', 'quantity', 'available_quantity', 'price'
            ])
            csv_writer.writeheader()
            csv_writer.writerows(books)
            output.seek(0)
            
            return send_file(
                output,
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'books_report_{datetime.now().strftime("%Y%m%d")}.csv'
            )
        
        elif report_type == 'members':
            result = member_model.get_all_members(skip=0, limit=10000)
            members = result['members']
            
            output = BytesIO()
            csv_writer = csv.DictWriter(output, fieldnames=[
                '_id', 'member_id', 'name', 'email', 'phone', 'membership_type', 'status'
            ])
            csv_writer.writeheader()
            csv_writer.writerows(members)
            output.seek(0)
            
            return send_file(
                output,
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'members_report_{datetime.now().strftime("%Y%m%d")}.csv'
            )
        
        return ResponseHelper.error_response('Invalid report type', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/dashboard-stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        book_stats = book_model.get_statistics()
        member_stats = member_model.get_statistics()
        issue_stats = issue_model.get_statistics()
        
        dashboard_data = {
            'books': book_stats,
            'members': member_stats,
            'issues': issue_stats,
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return ResponseHelper.success_response('Dashboard statistics retrieved successfully', dashboard_data)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@settings_bp.route('/recent-activities', methods=['GET'])
@login_required
def get_recent_activities():
    """Get recent activities for dashboard"""
    try:
        from database.mongodb import mongo
        
        activities = list(
            mongo.db.activity_logs.find({}).sort('timestamp', -1).limit(10)
        )
        
        for activity in activities:
            activity['_id'] = str(activity['_id'])
            activity['timestamp'] = activity['timestamp'].strftime('%Y-%m-%d %H:%M:%S') if activity.get('timestamp') else ''
        
        return ResponseHelper.success_response('Recent activities retrieved successfully', activities)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)
