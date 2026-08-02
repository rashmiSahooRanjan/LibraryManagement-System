"""
Helper utilities for Library Management System
"""
import os
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image
from io import BytesIO
import io


class FileHelper:
    """File handling helper"""
    
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    
    @staticmethod
    def allowed_file(filename):
        """Check if file extension is allowed"""
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in FileHelper.ALLOWED_EXTENSIONS
    
    @staticmethod
    def save_upload_file(file, upload_folder):
        """Save uploaded file"""
        try:
            if not file or file.filename == '':
                return None
            
            if not FileHelper.allowed_file(file.filename):
                return None
            
            # Create filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
            filename = secure_filename(timestamp + file.filename)
            
            # Ensure upload folder exists
            os.makedirs(upload_folder, exist_ok=True)
            
            filepath = os.path.join(upload_folder, filename)
            
            # Check file size
            file.seek(0, os.SEEK_END)
            file_length = file.tell()
            file.seek(0)
            
            if file_length > FileHelper.MAX_FILE_SIZE:
                return None
            
            # Save file
            file.save(filepath)
            
            # Compress image if needed
            try:
                img = Image.open(filepath)
                if img.size[0] > 1000 or img.size[1] > 1000:
                    img.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
                    img.save(filepath, quality=85)
            except:
                pass
            
            return filename
            
        except Exception as e:
            return None
    
    @staticmethod
    def delete_file(filepath):
        """Delete file"""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                return True
            return False
        except:
            return False


class DateHelper:
    """Date handling helper"""
    
    @staticmethod
    def format_date(date_obj, format_string='%d-%m-%Y'):
        """Format date object to string"""
        try:
            if isinstance(date_obj, str):
                return date_obj
            return date_obj.strftime(format_string)
        except:
            return str(date_obj)
    
    @staticmethod
    def get_date_difference(start_date, end_date):
        """Get difference between two dates in days"""
        try:
            if isinstance(start_date, str):
                start_date = datetime.strptime(start_date, '%Y-%m-%d')
            if isinstance(end_date, str):
                end_date = datetime.strptime(end_date, '%Y-%m-%d')
            
            return (end_date - start_date).days
        except:
            return 0
    
    @staticmethod
    def is_overdue(return_date):
        """Check if book is overdue"""
        try:
            if isinstance(return_date, str):
                return_date = datetime.strptime(return_date, '%Y-%m-%d')
            
            return return_date < datetime.now()
        except:
            return False


class ReportHelper:
    """Report generation helper"""
    
    @staticmethod
    def generate_report_data(books, members, issues):
        """Generate report data"""
        return {
            'total_books': len(books),
            'total_members': len(members),
            'total_issues': len(issues),
            'issued_books': sum(1 for issue in issues if issue.get('status') == 'issued'),
            'returned_books': sum(1 for issue in issues if issue.get('status') == 'returned'),
            'overdue_books': sum(1 for issue in issues if issue.get('status') == 'overdue'),
            'report_date': datetime.now().strftime('%d-%m-%Y %H:%M:%S')
        }
    
    @staticmethod
    def format_report_for_excel(data):
        """Format data for Excel export"""
        return data
    
    @staticmethod
    def format_report_for_csv(data):
        """Format data for CSV export"""
        return data
    
    @staticmethod
    def format_report_for_pdf(data):
        """Format data for PDF export"""
        return data


class StatisticsHelper:
    """Statistics calculation helper"""
    
    @staticmethod
    def get_issue_statistics(issues):
        """Calculate issue statistics"""
        total = len(issues)
        issued = sum(1 for issue in issues if issue.get('status') == 'issued')
        returned = sum(1 for issue in issues if issue.get('status') == 'returned')
        overdue = sum(1 for issue in issues if issue.get('status') == 'overdue')
        
        return {
            'total': total,
            'issued': issued,
            'returned': returned,
            'overdue': overdue,
            'issued_percentage': (issued / total * 100) if total > 0 else 0,
            'returned_percentage': (returned / total * 100) if total > 0 else 0
        }
    
    @staticmethod
    def get_category_statistics(books):
        """Calculate statistics by category"""
        categories = {}
        
        for book in books:
            category = book.get('category', 'Uncategorized')
            if category not in categories:
                categories[category] = {'total': 0, 'available': 0}
            
            categories[category]['total'] += 1
            if book.get('available_quantity', 0) > 0:
                categories[category]['available'] += 1
        
        return categories
    
    @staticmethod
    def get_fine_statistics(fines):
        """Calculate fine statistics"""
        total_fine = sum(fine.get('amount', 0) for fine in fines)
        paid_fine = sum(fine.get('amount', 0) for fine in fines if fine.get('paid'))
        pending_fine = total_fine - paid_fine
        
        return {
            'total_fine': total_fine,
            'paid_fine': paid_fine,
            'pending_fine': pending_fine
        }


class PaginationHelper:
    """Pagination helper"""
    
    @staticmethod
    def get_pagination_info(total, page, items_per_page):
        """Get pagination information"""
        total_pages = (total + items_per_page - 1) // items_per_page
        skip = (page - 1) * items_per_page
        
        return {
            'page': page,
            'items_per_page': items_per_page,
            'total': total,
            'total_pages': total_pages,
            'skip': skip,
            'has_prev': page > 1,
            'has_next': page < total_pages,
            'prev_page': page - 1 if page > 1 else None,
            'next_page': page + 1 if page < total_pages else None
        }


class ResponseHelper:
    """Response formatting helper"""
    
    @staticmethod
    def success_response(message, data=None, status_code=200):
        """Return success response"""
        response = {
            'success': True,
            'message': message,
            'data': data
        }
        return response, status_code
    
    @staticmethod
    def error_response(message, status_code=400):
        """Return error response"""
        response = {
            'success': False,
            'message': message
        }
        return response, status_code
    
    @staticmethod
    def paginated_response(items, total, page, items_per_page, message='Success'):
        """Return paginated response"""
        pagination = PaginationHelper.get_pagination_info(total, page, items_per_page)
        
        response = {
            'success': True,
            'message': message,
            'data': items,
            'pagination': pagination
        }
        return response, 200
