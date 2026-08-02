"""
Books routes for Library Management System
"""
from flask import Blueprint, request, jsonify, session
from models.Book import Book
from models.Category import Category
from utils.validation import Validator
from utils.helpers import ResponseHelper, FileHelper, PaginationHelper
from database.mongodb import log_activity
from functools import wraps

books_bp = Blueprint('books', __name__)

book_model = Book()
category_model = Category()


def login_required(f):
    """Decorator to check if user is logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function


@books_bp.route('/books', methods=['GET'])
@login_required
def get_books():
    """Get all books"""
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


@books_bp.route('/books/<book_id>', methods=['GET'])
@login_required
def get_book(book_id):
    """Get single book"""
    try:
        book = book_model.get_book(book_id)
        
        if not book:
            return ResponseHelper.error_response('Book not found', 404)
        
        return ResponseHelper.success_response('Book retrieved successfully', book)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/books', methods=['POST'])
@login_required
def create_book():
    """Create new book"""
    try:
        # Get form data
        data = {
            'isbn': request.form.get('isbn', '').strip(),
            'title': request.form.get('title', '').strip(),
            'author': request.form.get('author', '').strip(),
            'publisher': request.form.get('publisher', '').strip(),
            'category': request.form.get('category', '').strip(),
            'language': request.form.get('language', 'English').strip(),
            'edition': request.form.get('edition', '1st').strip(),
            'publication_year': request.form.get('publication_year', '').strip(),
            'price': request.form.get('price', '0').strip(),
            'quantity': request.form.get('quantity', '0').strip(),
            'shelf_number': request.form.get('shelf_number', '').strip(),
            'description': request.form.get('description', '').strip()
        }
        
        # Validate data
        is_valid, message = Validator.validate_book_data(data)
        if not is_valid:
            return ResponseHelper.error_response(message, 400)
        
        # Handle file upload
        if 'cover_image' in request.files:
            file = request.files['cover_image']
            if file and FileHelper.allowed_file(file.filename):
                filename = FileHelper.save_upload_file(file, 'static/images/uploads')
                if filename:
                    data['cover_image'] = filename
        
        # Create book
        result = book_model.create_book(data)
        
        if result['success']:
            log_activity(session.get('admin_id'), 'create_book', f"Book '{data['title']}' created")
            return ResponseHelper.success_response(result['message'], {'book_id': result['book_id']}, 201)
        else:
            return ResponseHelper.error_response(result['message'], 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/books/<book_id>', methods=['PUT'])
@login_required
def update_book(book_id):
    """Update book"""
    try:
        update_data = {}
        
        # Get form data
        fields = ['title', 'author', 'publisher', 'category', 'language', 'edition',
                  'publication_year', 'price', 'quantity', 'shelf_number', 'description']
        
        for field in fields:
            value = request.form.get(field)
            if value:
                update_data[field] = value
        
        # Handle file upload
        if 'cover_image' in request.files:
            file = request.files['cover_image']
            if file and FileHelper.allowed_file(file.filename):
                filename = FileHelper.save_upload_file(file, 'static/images/uploads')
                if filename:
                    update_data['cover_image'] = filename
        
        # Update book
        if book_model.update_book(book_id, update_data):
            log_activity(session.get('admin_id'), 'update_book', f"Book {book_id} updated")
            return ResponseHelper.success_response('Book updated successfully')
        else:
            return ResponseHelper.error_response('Failed to update book', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/books/<book_id>', methods=['DELETE'])
@login_required
def delete_book(book_id):
    """Delete book"""
    try:
        if book_model.delete_book(book_id):
            log_activity(session.get('admin_id'), 'delete_book', f"Book {book_id} deleted")
            return ResponseHelper.success_response('Book deleted successfully')
        else:
            return ResponseHelper.error_response('Failed to delete book', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/books/search/<search_type>', methods=['GET'])
@login_required
def search_books(search_type):
    """Search books"""
    try:
        search_value = request.args.get('query', '').strip()
        page = request.args.get('page', 1, type=int)
        items_per_page = 10
        
        skip = (page - 1) * items_per_page
        
        result = book_model.search_books(search_type, search_value, skip=skip, limit=items_per_page)
        
        return ResponseHelper.paginated_response(
            result['books'],
            result['total'],
            page,
            items_per_page,
            'Search results'
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/books/category/<category>', methods=['GET'])
@login_required
def get_books_by_category(category):
    """Get books by category"""
    try:
        page = request.args.get('page', 1, type=int)
        items_per_page = 10
        
        skip = (page - 1) * items_per_page
        
        result = book_model.get_books_by_category(category, skip=skip, limit=items_per_page)
        
        return ResponseHelper.paginated_response(
            result['books'],
            result['total'],
            page,
            items_per_page,
            'Books by category'
        )
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


# Category routes

@books_bp.route('/categories', methods=['GET'])
@login_required
def get_categories():
    """Get all categories"""
    try:
        categories = category_model.get_all_categories()
        return ResponseHelper.success_response('Categories retrieved successfully', categories)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/categories', methods=['POST'])
@login_required
def create_category():
    """Create new category"""
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return ResponseHelper.error_response('Category name required', 400)
        
        result = category_model.create_category(
            data['name'],
            data.get('description', '')
        )
        
        if result['success']:
            log_activity(session.get('admin_id'), 'create_category', f"Category '{data['name']}' created")
            return ResponseHelper.success_response(result['message'], {'category_id': result['category_id']}, 201)
        else:
            return ResponseHelper.error_response(result['message'], 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/categories/<category_id>', methods=['GET'])
@login_required
def get_category(category_id):
    """Get single category"""
    try:
        category = category_model.get_category(category_id)
        
        if not category:
            return ResponseHelper.error_response('Category not found', 404)
        
        return ResponseHelper.success_response('Category retrieved successfully', category)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/categories/<category_id>', methods=['PUT'])
@login_required
def update_category(category_id):
    """Update category"""
    try:
        data = request.get_json()
        
        if category_model.update_category(category_id, data):
            log_activity(session.get('admin_id'), 'update_category', f"Category {category_id} updated")
            return ResponseHelper.success_response('Category updated successfully')
        else:
            return ResponseHelper.error_response('Failed to update category', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/categories/<category_id>', methods=['DELETE'])
@login_required
def delete_category(category_id):
    """Delete category"""
    try:
        if category_model.delete_category(category_id):
            log_activity(session.get('admin_id'), 'delete_category', f"Category {category_id} deleted")
            return ResponseHelper.success_response('Category deleted successfully')
        else:
            return ResponseHelper.error_response('Failed to delete category', 400)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/statistics', methods=['GET'])
@login_required
def get_statistics():
    """Get book statistics"""
    try:
        stats = book_model.get_statistics()
        return ResponseHelper.success_response('Statistics retrieved successfully', stats)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)


@books_bp.route('/category-counts', methods=['GET'])
@login_required
def get_category_counts():
    """Get book counts per category (for category chart)"""
    try:
        counts = book_model.get_category_book_counts()
        return ResponseHelper.success_response('Category counts retrieved successfully', counts)
    
    except Exception as e:
        return ResponseHelper.error_response(str(e), 500)
