"""
Payment routes for Library Management System
Librarian (admin) views online fine payments received from
Students & Teachers and confirms them.
"""
from flask import Blueprint, request, jsonify, session
from models.Payment import FinePayment
from models.Member import Member
from models.Issue import Issue
from database.mongodb import log_activity
from utils.helpers import ResponseHelper
from functools import wraps

payments_bp = Blueprint('payments', __name__)

payment_model = FinePayment()
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


@payments_bp.route('/payments', methods=['GET'])
@login_required
def get_payments():
    """Get all fine payments (paginated, filterable)"""
    try:
        page = request.args.get('page', 1, type=int)
        status = request.args.get('status', '', type=str)
        search_query = request.args.get('search', '', type=str)
        items_per_page = request.args.get('limit', 10, type=int)

        skip = (page - 1) * items_per_page

        result = payment_model.get_all_payments(
            skip=skip,
            limit=items_per_page,
            status=status if status else None,
            search_query=search_query if search_query else None
        )

        # Enrich payments with member + book info
        for payment in result['payments']:
            payment['_id'] = str(payment['_id'])

            # Member details
            member = None
            try:
                from bson.objectid import ObjectId
                from database.mongodb import mongo
                member = mongo.db.members.find_one({'_id': ObjectId(payment['member_id'])})
            except Exception:
                pass

            payment['member'] = {
                'name': member.get('name') if member else payment.get('member_name', 'Unknown'),
                'member_id': member.get('member_id') if member else '',
                'email': member.get('email') if member else '',
                'membership_type': member.get('membership_type') if member else '',
                'phone': member.get('phone') if member else ''
            } if member else {
                'name': payment.get('member_name', 'Unknown'),
                'member_id': '',
                'email': '',
                'membership_type': '',
                'phone': ''
            }

            # Book titles for linked issues
            book_titles = []
            for issue_id in (payment.get('issue_ids') or []):
                issue = issue_model.get_issue(issue_id) if issue_id else None
                if issue and issue.get('book_id'):
                    book = None
                    try:
                        from models.Book import Book
                        book = Book().get_book(issue['book_id'])
                    except Exception:
                        pass
                    book_titles.append(book['title'] if book else 'Unknown')
                elif issue:
                    book_titles.append('Unknown Book')
            payment['book_titles'] = book_titles

        return ResponseHelper.paginated_response(
            result['payments'],
            result['total'],
            page,
            items_per_page,
            'Payments retrieved successfully'
        )

    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@payments_bp.route('/payments/statistics', methods=['GET'])
@login_required
def get_payment_statistics():
    """Get payment statistics for the librarian dashboard"""
    try:
        stats = payment_model.get_statistics()
        return ResponseHelper.success_response('Payment statistics retrieved successfully', stats)

    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@payments_bp.route('/payments/<payment_id>', methods=['GET'])
@login_required
def get_payment(payment_id):
    """Get a single payment"""
    try:
        payment = payment_model.get_payment(payment_id)

        if not payment:
            return ResponseHelper.error_response('Payment not found', 404)

        return ResponseHelper.success_response('Payment retrieved successfully', payment)

    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@payments_bp.route('/payments/<payment_id>/confirm', methods=['POST'])
@login_required
def confirm_payment(payment_id):
    """Librarian confirms a pending online fine payment.

    After confirmation the fine is marked paid and no longer appears
    in the student/teacher fine section.
    """
    try:
        result = payment_model.confirm_payment(payment_id, session.get('admin_id'))

        if result['success']:
            payment = payment_model.get_payment(payment_id)
            member_name = payment.get('member_name', 'Unknown') if payment else 'Unknown'
            amount = payment.get('amount', 0) if payment else 0

            log_activity(
                session.get('admin_id'),
                'confirm_payment',
                f"Fine payment confirmed - {member_name}, ₹{amount}"
            )

            return ResponseHelper.success_response(result['message'], {'payment_id': payment_id})
        else:
            return ResponseHelper.error_response(result['message'], 400)

    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)

