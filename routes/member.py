"""
Member Portal Routes for Library Management System
Handles Student & Teacher login, dashboard, browsing books,
viewing issued books, fines, and new arrivals.
"""
from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for
from models.Member import Member
from models.Book import Book
from models.Issue import Issue
from models.Category import Category
from models.Payment import FinePayment
from utils.helpers import ResponseHelper, DateHelper
from functools import wraps
from datetime import datetime

member_bp = Blueprint('member', __name__, url_prefix='/member')

member_model = Member()
book_model = Book()
issue_model = Issue()
category_model = Category()
payment_model = FinePayment()


def compute_issue_display_status(issue):
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


def member_login_required(f):
    """Decorator to check if a member is logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'member_id' not in session:
            return ResponseHelper.error_response('Unauthorized. Please login first.', 401)
        return f(*args, **kwargs)
    return decorated_function


@member_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Member login page and handler"""
    # If already logged in, redirect to dashboard
    if 'member_id' in session:
        return redirect(url_for('member.dashboard'))
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            
            identifier = data.get('username', '').strip()
            password = data.get('password', '').strip()
            membership_type = data.get('membership_type', '').strip()
            
            if not identifier or not password:
                return ResponseHelper.error_response('Username and password required', 400)
            
            result = member_model.authenticate_member(identifier, password)
            
            if not result['success']:
                return ResponseHelper.error_response(result['message'], 401)
            
            # Verify the member type matches selected tab (if provided)
            member = result['member']
            member_role = member['membership_type'].lower()
            
            if membership_type:
                # "teacher" tab includes Teacher; "student" tab includes Student
                if membership_type == 'teacher' and member_role not in ('teacher', 'faculty'):
                    return ResponseHelper.error_response(
                        'This account is not a Teacher account. Please use the correct login tab.', 401
                    )
                if membership_type == 'student' and member_role != 'student':
                    return ResponseHelper.error_response(
                        'This account is not a Student account. Please use the correct login tab.', 401
                    )
            
            # Set session
            session['member_id'] = member['_id']
            session['member_username'] = member['username']
            session['member_name'] = member['name']
            session['member_email'] = member['email']
            session['member_type'] = member['membership_type']
            session.permanent = True
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'member': member,
                'redirect': url_for('member.dashboard')
            }), 200
        
        except Exception as e:
            return ResponseHelper.error_response(str(e), 500)
    
    return render_template('member_login.html')


@member_bp.route('/logout', methods=['POST'])
def logout():
    """Member logout"""
    try:
        # Clear only member session keys
        session.pop('member_id', None)
        session.pop('member_username', None)
        session.pop('member_name', None)
        session.pop('member_email', None)
        session.pop('member_type', None)
        return ResponseHelper.success_response('Logout successful')
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@member_bp.route('/verify-session', methods=['GET'])
def verify_session():
    """Verify member session"""
    if 'member_id' in session:
        return jsonify({
            'success': True,
            'member': {
                '_id': session['member_id'],
                'username': session.get('member_username'),
                'name': session.get('member_name'),
                'email': session.get('member_email'),
                'membership_type': session.get('member_type')
            }
        }), 200
    return jsonify({'success': False, 'message': 'Not logged in'}), 401


@member_bp.route('/dashboard')
def dashboard():
    """Member portal dashboard page"""
    if 'member_id' not in session:
        return redirect(url_for('member.login'))
    return render_template('member_dashboard.html')


# ============== MEMBER API ENDPOINTS ==============

@member_bp.route('/api/dashboard-stats', methods=['GET'])
@member_login_required
def get_dashboard_stats():
    """Get stats for member dashboard"""
    try:
        member_id = session['member_id']
        
        # Member's own issued books (currently issued)
        issued_books = issue_model.get_member_issued_books(member_id)
        
        # Member's full history
        all_issues = issue_model.get_member_all_issues(member_id)
        
        # Calculate fines
        total_fine = 0
        pending_fine = 0
        for issue in all_issues:
            fine = issue.get('fine_amount') or 0
            total_fine += fine
            if issue.get('status') == 'returned' and not issue.get('fine_paid'):
                pending_fine += fine
            if issue.get('status') == 'issued':
                # Compute live overdue fine
                try:
                    return_date = issue.get('return_date')
                    if return_date and isinstance(return_date, str):
                        rd = datetime.fromisoformat(return_date)
                        if rd < datetime.now():
                            days = (datetime.now() - rd).days
                            pending_fine += days * 5
                except:
                    pass
        
        # New arrivals (books added in last 30 days)
        from database.mongodb import get_current_timestamp
        from datetime import timedelta
        cutoff = get_current_timestamp() - timedelta(days=30)
        new_books = book_model.find_many({'created_at': {'$gte': cutoff}}, limit=5)
        
        stats = {
            'total_books': book_model.count({}),
            'available_books': book_model.count({'available_quantity': {'$gt': 0}}),
            'my_issued_books': len(issued_books),
            'new_arrivals': len(new_books),
            'total_fine': total_fine,
            'pending_fine': pending_fine,
            'my_history_count': len(all_issues)
        }
        
        return ResponseHelper.success_response('Dashboard stats retrieved successfully', stats)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@member_bp.route('/api/books', methods=['GET'])
@member_login_required
def get_books():
    """Get books available in library (browse/search)"""
    try:
        page = request.args.get('page', 1, type=int)
        search_query = request.args.get('search', '', type=str)
        category = request.args.get('category', '', type=str)
        items_per_page = request.args.get('limit', 10, type=int)
        
        skip = (page - 1) * items_per_page
        
        result = book_model.get_all_books(
            skip=skip,
            limit=items_per_page,
            search_query=search_query if search_query else None,
            category=category if category else None
        )
        
        return ResponseHelper.paginated_response(
            result['books'],
            result['total'],
            page,
            items_per_page,
            'Books retrieved successfully'
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@member_bp.route('/api/books/new', methods=['GET'])
@member_login_required
def get_new_books():
    """Get newly added books (last 30 days)"""
    try:
        from database.mongodb import get_current_timestamp
        from datetime import timedelta
        
        cutoff = get_current_timestamp() - timedelta(days=30)
        
        books = book_model.find_many({'created_at': {'$gte': cutoff}}, limit=20)
        total = book_model.count({'created_at': {'$gte': cutoff}})
        
        for book in books:
            book['_id'] = str(book['_id'])
            if book.get('created_at'):
                book['created_at'] = book['created_at'].isoformat()
        
        return ResponseHelper.success_response('New books retrieved successfully', {
            'books': books,
            'total': total
        })
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@member_bp.route('/api/categories', methods=['GET'])
@member_login_required
def get_categories():
    """Get all book categories for filtering"""
    try:
        categories = category_model.get_all_categories()
        return ResponseHelper.success_response('Categories retrieved successfully', categories)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@member_bp.route('/api/my-issues', methods=['GET'])
@member_login_required
def get_my_issues():
    """Get member's issued books with fines"""
    try:
        member_id = session['member_id']
        status = request.args.get('status', '', type=str)
        search_query = request.args.get('search', '', type=str)
        
        all_issues = issue_model.get_member_all_issues(member_id)
        
        # Filter by status if provided
        if status:
            all_issues = [i for i in all_issues if i.get('status') == status]
        
        # Enrich with book details
        enriched = []
        for issue in all_issues:
            book = book_model.get_book(issue['book_id']) if issue.get('book_id') else None
            
            item = {
                '_id': issue.get('_id'),
                'issue_id': issue.get('issue_id'),
                'issue_date': issue.get('issue_date'),
                'return_date': issue.get('return_date'),
                'actual_return_date': issue.get('actual_return_date'),
                'status': issue.get('status'),
                'fine_amount': issue.get('fine_amount') or 0,
                'book': {
                    'title': book['title'] if book else 'Unknown',
                    'author': book['author'] if book else '',
                    'isbn': book['isbn'] if book else '',
                    'category': book['category'] if book else '',
                    'cover_image': book.get('cover_image') if book else None,
                    'book_id': book['book_id'] if book else ''
                } if book else None
            }
            
            # Calculate live overdue fine for currently issued books
            if item['status'] == 'issued' and item['return_date']:
                try:
                    rd = datetime.fromisoformat(item['return_date'].replace('Z', '+00:00'))
                    # Handle naive datetime
                    if rd.tzinfo is not None:
                        rd = rd.replace(tzinfo=None)
                    if rd < datetime.now():
                        days = (datetime.now() - rd).days
                        item['overdue_fine'] = days * 5
                    else:
                        item['overdue_fine'] = 0
                except:
                    item['overdue_fine'] = 0
            else:
                item['overdue_fine'] = 0

            # Date-based display status: Returned / Overdue / Issued
            item['display_status'] = compute_issue_display_status(issue)
            
            enriched.append(item)
        
        # Apply search filter if provided (search by book title or author)
        if search_query:
            sq = search_query.lower()
            enriched = [
                i for i in enriched
                if sq in (i.get('book') or {}).get('title', '').lower()
                or sq in (i.get('book') or {}).get('author', '').lower()
                or sq in (i.get('book') or {}).get('isbn', '').lower()
                or sq in (i.get('issue_id') or '').lower()
            ]
        
        return ResponseHelper.success_response('My issues retrieved successfully', enriched)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@member_bp.route('/api/profile', methods=['GET'])
@member_login_required
def get_profile():
    """Get member profile"""
    try:
        member = member_model.get_member(session['member_id'])
        
        if not member:
            return ResponseHelper.error_response('Member not found', 404)
        
        # Remove sensitive fields
        member.pop('password', None)
        
        return ResponseHelper.success_response('Profile retrieved successfully', member)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@member_bp.route('/api/profile', methods=['PUT'])
@member_login_required
def update_profile():
    """Update member profile (phone, address, department, roll_number)"""
    try:
        data = request.get_json() if request.is_json else request.form
        
        update_data = {}
        
        allowed_fields = ['phone', 'address', 'department', 'roll_number', 'gender', 'dob']
        
        for field in allowed_fields:
            if field in data and data[field]:
                update_data[field] = data[field]
        
        if not update_data:
            return ResponseHelper.error_response('No data to update', 400)
        
        if member_model.update_member(session['member_id'], update_data):
            return ResponseHelper.success_response('Profile updated successfully')
        else:
            return ResponseHelper.error_response('Failed to update profile', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


# ============== FINE PAYMENT ENDPOINTS ==============

@member_bp.route('/api/my-fines', methods=['GET'])
@member_login_required
def get_my_fines():
    """Get member's outstanding fines"""
    try:
        member_id = session['member_id']

        fines = issue_model.get_member_fines(member_id)

        return ResponseHelper.success_response('Fines retrieved successfully', fines)

    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@member_bp.route('/api/payment-history', methods=['GET'])
@member_login_required
def get_payment_history():
    """Get member's payment history"""
    try:
        member_id = session['member_id']

        payments = payment_model.get_member_payments(member_id)

        # Format dates
        for payment in payments:
            if payment.get('paid_at'):
                try:
                    payment['paid_at'] = payment['paid_at'].isoformat()
                except Exception:
                    pass
            if payment.get('confirmed_at'):
                try:
                    payment['confirmed_at'] = payment['confirmed_at'].isoformat()
                except Exception:
                    pass

        return ResponseHelper.success_response('Payment history retrieved successfully', payments)

    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@member_bp.route('/api/pay-fine', methods=['POST'])
@member_login_required
def pay_fine():
    """Record a successful online fine payment from the payment gateway.

    Creates a payment record with status 'pending'. The librarian confirms
    the payment in the admin 'Payment Received' section, after which the
    fine disappears from the member's fine section.
    """
    try:
        data = request.get_json() or {}

        member_id = session['member_id']
        amount = data.get('amount')
        issue_ids = data.get('issue_ids') or []
        payment_method = data.get('payment_method', 'UPI')
        transaction_id = data.get('transaction_id', '')

        if not amount or float(amount) <= 0:
            return ResponseHelper.error_response('Valid amount is required', 400)

        if not issue_ids:
            return ResponseHelper.error_response('No fines selected for payment', 400)

        result = payment_model.create_payment(
            member_id=member_id,
            issue_ids=issue_ids,
            amount=float(amount),
            payment_method=payment_method,
            transaction_id=transaction_id or None
        )

        if result['success']:
            return ResponseHelper.success_response(
                'Payment recorded successfully. Waiting for librarian confirmation.',
                {'payment_id': result['payment_id']},
                201
            )
        else:
            return ResponseHelper.error_response(result['message'], 400)

    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)

