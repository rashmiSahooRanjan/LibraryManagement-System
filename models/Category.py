"""
Category Model for Library Management System
"""
from database.mongodb import BaseRepository, get_current_timestamp
from bson.objectid import ObjectId


class Category(BaseRepository):
    """Category model"""
    
    def __init__(self):
        """Initialize Category repository"""
        super().__init__('categories')
    
    def create_category(self, category_name, description=''):
        """Create new category"""
        try:
            # Check if category already exists
            if self.find_one({'name': category_name}):
                return {'success': False, 'message': 'Category already exists'}
            
            # Prepare category document
            category = {
                'name': category_name,
                'description': description,
                'created_at': get_current_timestamp(),
                'updated_at': get_current_timestamp()
            }
            
            # Insert into database
            category_id = self.insert_one(category)
            return {'success': True, 'message': 'Category created successfully', 'category_id': str(category_id)}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def get_category(self, category_id):
        """Get category by ID"""
        try:
            category = self.find_one({'_id': ObjectId(category_id)})
            if category:
                category['_id'] = str(category['_id'])
                return category
            return None
        except:
            return None
    
    def get_all_categories(self):
        """Get all categories"""
        categories = self.find_many({}, limit=1000)
        
        for category in categories:
            category['_id'] = str(category['_id'])
        
        return categories
    
    def update_category(self, category_id, update_data):
        """Update category"""
        try:
            update_data['updated_at'] = get_current_timestamp()
            return self.update_one({'_id': ObjectId(category_id)}, update_data)
        except:
            return False
    
    def delete_category(self, category_id):
        """Delete category"""
        try:
            return self.delete_one({'_id': ObjectId(category_id)})
        except:
            return False
    
    def search_categories(self, search_value):
        """Search categories"""
        categories = self.find_many({
            'name': {'$regex': search_value, '$options': 'i'}
        })
        
        for category in categories:
            category['_id'] = str(category['_id'])
        
        return categories
