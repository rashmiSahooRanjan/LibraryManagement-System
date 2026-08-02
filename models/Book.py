"""
Book Model for Library Management System
"""
from database.mongodb import BaseRepository, get_current_timestamp
from bson.objectid import ObjectId
import uuid


class Book(BaseRepository):
    """Book model"""
    
    def __init__(self):
        """Initialize Book repository"""
        super().__init__('books')
    
    def generate_book_id(self):
        """Generate unique book ID"""
        return 'BK' + str(uuid.uuid4().hex[:8]).upper()
    
    def create_book(self, book_data):
        """Create new book"""
        try:
            # Check if ISBN already exists
            if self.find_one({'isbn': book_data['isbn']}):
                return {'success': False, 'message': 'ISBN already exists'}
            
            # Prepare book document
            book = {
                'book_id': self.generate_book_id(),
                'isbn': book_data['isbn'],
                'title': book_data['title'],
                'author': book_data['author'],
                'publisher': book_data['publisher'],
                'category': book_data['category'],
                'language': book_data.get('language', 'English'),
                'edition': book_data.get('edition', '1st'),
                'publication_year': book_data.get('publication_year'),
                'price': float(book_data.get('price', 0)),
                'quantity': int(book_data['quantity']),
                'available_quantity': int(book_data['quantity']),
                'shelf_number': book_data.get('shelf_number', ''),
                'cover_image': book_data.get('cover_image'),
                'description': book_data.get('description', ''),
                'status': 'available',
                'created_at': get_current_timestamp(),
                'updated_at': get_current_timestamp()
            }
            
            # Insert into database
            book_id = self.insert_one(book)
            return {'success': True, 'message': 'Book created successfully', 'book_id': str(book_id)}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def get_book(self, book_id):
        """Get book by ID"""
        try:
            book = self.find_one({'_id': ObjectId(book_id)})
            if book:
                book['_id'] = str(book['_id'])
                return book
            return None
        except:
            return None
    
    def get_book_by_isbn(self, isbn):
        """Get book by ISBN"""
        return self.find_one({'isbn': isbn})
    
    def get_all_books(self, skip=0, limit=10, search_query=None, category=None):
        """Get all books with pagination and filtering"""
        query = {}
        
        if search_query:
            query['$or'] = [
                {'title': {'$regex': search_query, '$options': 'i'}},
                {'author': {'$regex': search_query, '$options': 'i'}},
                {'isbn': search_query}
            ]
        
        if category:
            query['category'] = category
        
        books = self.find_many(query, skip=skip, limit=limit)
        total = self.count(query)
        
        for book in books:
            book['_id'] = str(book['_id'])
        
        return {'books': books, 'total': total}
    
    def update_book(self, book_id, update_data):
        """Update book information"""
        try:
            update_data['updated_at'] = get_current_timestamp()
            return self.update_one({'_id': ObjectId(book_id)}, update_data)
        except:
            return False
    
    def delete_book(self, book_id):
        """Delete book"""
        try:
            return self.delete_one({'_id': ObjectId(book_id)})
        except:
            return False
    
    def search_books(self, search_type, search_value, skip=0, limit=10):
        """Search books by various fields"""
        query = {}
        
        if search_type == 'title':
            query['title'] = {'$regex': search_value, '$options': 'i'}
        elif search_type == 'author':
            query['author'] = {'$regex': search_value, '$options': 'i'}
        elif search_type == 'isbn':
            query['isbn'] = search_value
        elif search_type == 'category':
            query['category'] = search_value
        elif search_type == 'publisher':
            query['publisher'] = {'$regex': search_value, '$options': 'i'}
        
        books = self.find_many(query, skip=skip, limit=limit)
        total = self.count(query)
        
        for book in books:
            book['_id'] = str(book['_id'])
        
        return {'books': books, 'total': total}
    
    def get_books_by_category(self, category, skip=0, limit=10):
        """Get books by category"""
        books = self.find_many({'category': category}, skip=skip, limit=limit)
        total = self.count({'category': category})
        
        for book in books:
            book['_id'] = str(book['_id'])
        
        return {'books': books, 'total': total}
    
    def update_available_quantity(self, book_id, quantity_change):
        """Update available quantity (issue or return book)"""
        try:
            book = self.find_one({'_id': ObjectId(book_id)})
            if not book:
                return {'success': False, 'message': 'Book not found'}
            
            new_quantity = book['available_quantity'] + quantity_change
            
            if new_quantity < 0:
                return {'success': False, 'message': 'Insufficient book quantity'}
            
            self.update_one({'_id': ObjectId(book_id)}, {
                'available_quantity': new_quantity
            })
            
            return {'success': True, 'message': 'Quantity updated'}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def get_statistics(self):
        """Get book statistics"""
        try:
            total_books = self.count({})
            # Count books where available quantity is less than quantity (i.e., some are issued)
            issued_books = self.count({'available_quantity': {'$lt': 0}})
            
            # Better: count via issued_books collection
            from database.mongodb import mongo
            issued = mongo.db.issued_books.count_documents({'status': 'issued'})
            
            return {
                'total_books': total_books,
                'available_books': self.count({'available_quantity': {'$gt': 0}}),
                'issued_books': issued,
                'categories': len(set([book['category'] for book in self.find_many({}, limit=10000)]))
            }
        except:
            return {
                'total_books': 0,
                'available_books': 0,
                'issued_books': 0,
                'categories': 0
            }
    
    def get_category_book_counts(self):
        """Get number of books in each category"""
        try:
            from database.mongodb import mongo
            pipeline = [
                {'$group': {'_id': '$category', 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}}
            ]
            results = list(mongo.db.books.aggregate(pipeline))
            
            counts = {}
            for result in results:
                counts[result['_id']] = result['count']
            
            return counts
        except Exception as e:
            print(f"Error getting category counts: {e}")
            return {}
