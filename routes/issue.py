"""
Issue and Return routes for Library Management System
"""
from flask import Blueprint, request, jsonify, session
from models.Issue import Issue, Return
from models.Book import Book
from models.Member import Member
from utils.helpers import ResponseHelper, DateHelper
from database.mongodb import log_activity
from functools import wraps
from datetime import datetime, timedelta

issue_bp = Blueprint('issue', __name__)

issue_model = Issue()
return_model = Return()
book_model = Book()
member_model = Member()


def compute_display_status(issue):
    """Compute a human-friendly, date-based status for an issue record.

    Returns:
        'Returned'  - if the book has been returned (status == 'returned')
        'Overdue'   - if still issued and return_date is before today
        'Issued'    - otherwise (still issued, not yet overdue)
    """
    try:
        # If the record has been returned, show Returned regardless of dates
        if issue.get('status') == 'returned':
            return 'Returned'

        # If it's still issued, check whether the due date has passed
        return_date = issue.get('return_date')
        if return_date:
            # Handle both datetime objects (from DB) and ISO strings (already serialized)
            if isinstance(return_date, str):
                rd = datetime.fromisoformat(return_date.replace('Z', '+00:00'))
                # Normalize timezone-aware to naive for comparison
                if rd.tzinfo is not None:
                    rd = rd.replace(tzinfo=None)
            else:
                rd = return_date
                if rd.tzinfo is not None:
                    rd = rd.replace(tzinfo=None)

            if rd < datetime.now():
                return 'Overdue'

        return 'Issued'
    except Exception:
        # Fallback to raw status on any parsing error
        return issue.get('status', 'Issued')


def login_required(f):
    """Decorator to check if user is logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function


@issue_bp.route('/issue', methods=['POST'])
@login_required
def issue_book():
    """Issue book to member"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('member_id') or not data.get('book_id'):
            return ResponseHelper.error_response('Member and Book are required', 400)
        
        # Check if book exists
        book = book_model.get_book(data['book_id'])
        if not book:
            return ResponseHelper.error_response('Book not found', 404)
        
        # Check if member exists
        member = member_model.get_member(data['member_id'])
        if not member:
            return ResponseHelper.error_response('Member not found', 404)
        
        # Check book availability
        if book['available_quantity'] <= 0:
            return ResponseHelper.error_response('Book is not available', 400)
        
        # Check member status
        if member['status'] != 'active':
            return ResponseHelper.error_response('Member is not active', 400)
        
        # Issue book
        issue_data = {
            'issue_date': data.get('issue_date', datetime.now().strftime('%Y-%m-%d')),
            'issue_days': data.get('issue_days', 14)
        }
        
        result = issue_model.issue_book(data['member_id'], data['book_id'], issue_data)
        
        if result['success']:
            # Update book availability
            book_model.update_available_quantity(data['book_id'], -1)
            
            log_activity(
                session.get('admin_id'),
                'issue_book',
                f"Book issued - Member: {member['name']}, Book: {book['title']}"
            )
            
            return ResponseHelper.success_response(
                result['message'],
                {'issue_id': result['issue_id']},
                201
            )
        else:
            return ResponseHelper.error_response(result['message'], 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@issue_bp.route('/issue/<issue_id>', methods=['GET'])
@login_required
def get_issue(issue_id):
    """Get issue details"""
    try:
        issue = issue_model.get_issue(issue_id)
        
        if not issue:
            return ResponseHelper.error_response('Issue not found', 404)
        
        return ResponseHelper.success_response('Issue retrieved successfully', issue)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@issue_bp.route('/issues', methods=['GET'])
@login_required
def get_issues():
    """Get all issued books"""
    try:
        page = request.args.get('page', 1, type=int)
        member_id = request.args.get('member_id', '', type=str)
        status = request.args.get('status', '', type=str)
        items_per_page = request.args.get('limit', 10, type=int)
        
        skip = (page - 1) * items_per_page
        
        result = issue_model.get_issued_books(
            skip=skip,
            limit=items_per_page,
            member_id=member_id if member_id else None,
            status=status if status else None
        )
        
        # Enrich issues with member names and book titles
        for issue in result['issues']:
            issue['_id'] = str(issue['_id'])
            member = member_model.get_member(issue['member_id']) if issue.get('member_id') else None
            book = book_model.get_book(issue['book_id']) if issue.get('book_id') else None
            
            issue['member_name'] = member['name'] if member else 'Unknown'
            issue['member_code'] = member['member_id'] if member else ''
            issue['book_title'] = book['title'] if book else 'Unknown'
            issue['book_isbn'] = book['isbn'] if book else ''
            issue['display_status'] = compute_display_status(issue)
        
        return ResponseHelper.paginated_response(
            result['issues'],
            result['total'],
            page,
            items_per_page,
            'Issues retrieved successfully'
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@issue_bp.route('/return', methods=['POST'])
@login_required
def return_book():
    """Return book"""
    try:
        data = request.get_json()
        
        if not data.get('issue_id'):
            return ResponseHelper.error_response('Issue ID is required', 400)
        
        # Get issue details
        issue = issue_model.get_issue(data['issue_id'])
        if not issue:
            return ResponseHelper.error_response('Issue not found', 404)
        
        # Return book
        return_date = data.get('return_date', datetime.now().strftime('%Y-%m-%d'))
        result = issue_model.return_book(data['issue_id'], return_date)
        
        if result['success']:
            # Update book availability
            book_model.update_available_quantity(issue['book_id'], 1)
            
            log_activity(
                session.get('admin_id'),
                'return_book',
                f"Book returned - Issue: {data['issue_id']}, Fine: ₹{result['fine_amount']}"
            )
            
            # If fine is applicable, create fine record
            if result['fine_amount'] > 0:
                fine_record = {
                    'issue_id': data['issue_id'],
                    'member_id': issue['member_id'],
                    'amount': result['fine_amount'],
                    'reason': 'Overdue book return',
                    'paid': False,
                    'paid_date': None,
                    'created_at': datetime.now(),
                    'updated_at': datetime.now()
                }
                # Note: Fine payment handling would go to fine management module
            
            return ResponseHelper.success_response(
                result['message'],
                {'fine_amount': result['fine_amount']},
                200
            )
        else:
            return ResponseHelper.error_response(result['message'], 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@issue_bp.route('/overdue-books', methods=['GET'])
@login_required
def get_overdue_books():
    """Get overdue books"""
    try:
        overdue = issue_model.get_overdue_books()
        
        return ResponseHelper.success_response(
            'Overdue books retrieved successfully',
            overdue
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@issue_bp.route('/today-issues', methods=['GET'])
@login_required
def get_today_issues():
    """Get today's issued books"""
    try:
        today_issues = issue_model.get_today_issues()
        
        return ResponseHelper.success_response(
            "Today's issued books retrieved successfully",
            today_issues
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@issue_bp.route('/today-returns', methods=['GET'])
@login_required
def get_today_returns():
    """Get today's returned books"""
    try:
        today_returns = issue_model.get_today_returns()
        
        return ResponseHelper.success_response(
            "Today's returned books retrieved successfully",
            today_returns
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@issue_bp.route('/member/<member_id>/issued-books', methods=['GET'])
@login_required
def get_member_issued_books(member_id):
    """Get all issued books for a member"""
    try:
        issued_books = issue_model.get_member_issued_books(member_id)
        
        for book in issued_books:
            book['_id'] = str(book['_id'])
        
        return ResponseHelper.success_response(
            'Member issued books retrieved successfully',
            issued_books
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@issue_bp.route('/statistics', methods=['GET'])
@login_required
def get_statistics():
    """Get issue statistics"""
    try:
        stats = issue_model.get_statistics()
        return ResponseHelper.success_response('Statistics retrieved successfully', stats)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@issue_bp.route('/returns', methods=['GET'])
@login_required
def get_returns():
    """Get all returned books from issued_books records (status = 'returned')"""
    try:
        page = request.args.get('page', 1, type=int)
        items_per_page = request.args.get('limit', 10, type=int)
        search_query = request.args.get('search', '', type=str)
        
        skip = (page - 1) * items_per_page
        
        # Read returned records from issued_books (where status == 'returned')
        result = issue_model.get_issued_books(
            skip=skip,
            limit=items_per_page,
            status='returned'
        )
        
        # Enrich returns with member names and book titles
        for issue in result['issues']:
            issue['_id'] = str(issue['_id'])
            member = member_model.get_member(issue['member_id']) if issue.get('member_id') else None
            book = book_model.get_book(issue['book_id']) if issue.get('book_id') else None
            
            issue['member_name'] = member['name'] if member else 'Unknown'
            issue['member_code'] = member['member_id'] if member else ''
            issue['book_title'] = book['title'] if book else 'Unknown'
            issue['book_isbn'] = book['isbn'] if book else ''
            issue['display_status'] = compute_display_status(issue)
        
        # Apply search filter if provided (search by member name or book title)
        if search_query:
            filtered = [
                issue for issue in result['issues']
                if search_query.lower() in (issue.get('member_name') or '').lower()
                or search_query.lower() in (issue.get('book_title') or '').lower()
                or search_query.lower() in (issue.get('member_code') or '').lower()
                or search_query.lower() in (issue.get('issue_id') or '').lower()
            ]
            result['issues'] = filtered
            result['total'] = len(filtered)
        
        return ResponseHelper.paginated_response(
            result['issues'],
            result['total'],
            page,
            items_per_page,
            'Returns retrieved successfully'
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)
