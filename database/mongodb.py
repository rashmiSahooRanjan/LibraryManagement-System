"""
MongoDB Connection and Database Operations Module
"""
from flask_pymongo import PyMongo
from datetime import datetime
from bson.objectid import ObjectId

mongo = PyMongo()


class DatabaseInit:
    """Initialize database collections and indexes"""
    
    @staticmethod
    def init_db(app):
        """Initialize MongoDB connection and create collections"""
        mongo.init_app(app)
        
        with app.app_context():
            try:
                # Get database
                db = mongo.db
                
                # Create collections if they don't exist
                collections = [
                    'admins', 'books', 'categories', 'members',
                    'issued_books', 'returned_books', 'fine_payments',
                    'activity_logs', 'settings'
                ]
                
                for collection in collections:
                    if collection not in db.list_collection_names():
                        db.create_collection(collection)
                
                # Create indexes
                db.books.create_index('book_id', unique=True)
                db.books.create_index('isbn', unique=True)
                db.books.create_index('title')
                db.books.create_index('author')
                db.books.create_index('category')
                
                db.members.create_index('member_id', unique=True)
                db.members.create_index('email', unique=True)
                
                db.admins.create_index('username', unique=True)
                db.admins.create_index('email', unique=True)
                
                db.issued_books.create_index('issue_id', unique=True)
                db.issued_books.create_index('member_id')
                db.issued_books.create_index('book_id')
                
                db.activity_logs.create_index('admin_id')
                db.activity_logs.create_index('timestamp')
                
                print("✓ Database initialized successfully")
                return True
                
            except Exception as e:
                print(f"✗ Database initialization failed: {str(e)}")
                return False


class BaseRepository:
    """Base repository for database operations"""
    
    def __init__(self, collection_name):
        """Initialize repository with collection name"""
        self.collection_name = collection_name
    
    def get_collection(self):
        """Get MongoDB collection"""
        return mongo.db[self.collection_name]
    
    def find_one(self, query):
        """Find single document"""
        return self.get_collection().find_one(query)
    
    def find_many(self, query, skip=0, limit=10):
        """Find multiple documents with pagination"""
        return list(self.get_collection().find(query).skip(skip).limit(limit))
    
    def count(self, query):
        """Count documents matching query"""
        return self.get_collection().count_documents(query)
    
    def insert_one(self, document):
        """Insert single document"""
        result = self.get_collection().insert_one(document)
        return result.inserted_id
    
    def insert_many(self, documents):
        """Insert multiple documents"""
        result = self.get_collection().insert_many(documents)
        return result.inserted_ids
    
    def update_one(self, query, update_data):
        """Update single document"""
        result = self.get_collection().update_one(
            query,
            {'$set': update_data}
        )
        return result.modified_count > 0
    
    def update_many(self, query, update_data):
        """Update multiple documents"""
        result = self.get_collection().update_many(
            query,
            {'$set': update_data}
        )
        return result.modified_count
    
    def delete_one(self, query):
        """Delete single document"""
        result = self.get_collection().delete_one(query)
        return result.deleted_count > 0
    
    def delete_many(self, query):
        """Delete multiple documents"""
        result = self.get_collection().delete_many(query)
        return result.deleted_count
    
    def increment(self, query, field, value=1):
        """Increment a field value"""
        self.get_collection().update_one(
            query,
            {'$inc': {field: value}}
        )


def get_current_timestamp():
    """Get current timestamp"""
    return datetime.utcnow()


def log_activity(admin_id, action, description, details=None):
    """Log user activity"""
    try:
        activity = {
            'admin_id': admin_id,
            'action': action,
            'description': description,
            'details': details or {},
            'timestamp': get_current_timestamp(),
            'ip_address': ''
        }
        mongo.db.activity_logs.insert_one(activity)
    except Exception as e:
        print(f"Error logging activity: {str(e)}")
