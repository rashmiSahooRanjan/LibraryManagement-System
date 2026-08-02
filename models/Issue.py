"""
Issue Model for Library Management System
"""
from database.mongodb import BaseRepository, get_current_timestamp
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import uuid


class Issue(BaseRepository):
    """Issue model for book issuance"""
    
    def __init__(self):
        """Initialize Issue repository"""
        super().__init__('issued_books')
    
    def generate_issue_id(self):
        """Generate unique issue ID"""
        return 'ISS' + str(uuid.uuid4().hex[:8]).upper()
    
    def issue_book(self, member_id, book_id, issue_data):
        """Issue book to member"""
        try:
            # Check if book is already issued to this member
            existing = self.find_one({
                'member_id': member_id,
                'book_id': book_id,
                'status': 'issued'
            })
            
            if existing:
                return {'success': False, 'message': 'Book already issued to this member'}
            
            # Prepare issue document
            issue_date = datetime.strptime(issue_data['issue_date'], '%Y-%m-%d')
            return_date = issue_date + timedelta(days=issue_data.get('issue_days', 14))
            
            issue = {
                'issue_id': self.generate_issue_id(),
                'member_id': member_id,
                'book_id': book_id,
                'issue_date': issue_date,
                'return_date': return_date,
                'actual_return_date': None,
                'status': 'issued',
                'fine_amount': 0,
                'fine_paid': False,
                'created_at': get_current_timestamp(),
                'updated_at': get_current_timestamp()
            }
            
            # Insert into database
            issue_id = self.insert_one(issue)
            return {'success': True, 'message': 'Book issued successfully', 'issue_id': str(issue_id)}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def get_issue(self, issue_id):
        """Get issue by ID"""
        try:
            issue = self.find_one({'_id': ObjectId(issue_id)})
            if issue:
                issue['_id'] = str(issue['_id'])
                issue['issue_date'] = issue['issue_date'].isoformat() if issue.get('issue_date') else None
                issue['return_date'] = issue['return_date'].isoformat() if issue.get('return_date') else None
                issue['actual_return_date'] = issue['actual_return_date'].isoformat() if issue.get('actual_return_date') else None
                return issue
            return None
        except:
            return None
    
    def get_issued_books(self, skip=0, limit=10, member_id=None, status=None):
        """Get issued books with pagination and filtering"""
        query = {}
        
        if member_id:
            query['member_id'] = member_id
        
        if status:
            query['status'] = status
        
        issues = self.find_many(query, skip=skip, limit=limit)
        total = self.count(query)
        
        for issue in issues:
            issue['_id'] = str(issue['_id'])
            issue['issue_date'] = issue['issue_date'].isoformat() if issue.get('issue_date') else None
            issue['return_date'] = issue['return_date'].isoformat() if issue.get('return_date') else None
            issue['actual_return_date'] = issue['actual_return_date'].isoformat() if issue.get('actual_return_date') else None
        
        return {'issues': issues, 'total': total}
    
    def return_book(self, issue_id, return_date=None):
        """Return book"""
        try:
            issue = self.find_one({'_id': ObjectId(issue_id)})
            
            if not issue:
                return {'success': False, 'message': 'Issue record not found'}
            
            if issue['status'] != 'issued':
                return {'success': False, 'message': 'Book is not currently issued'}
            
            # Calculate fine if applicable
            actual_return = datetime.strptime(return_date, '%Y-%m-%d') if return_date else datetime.now()
            fine_amount = self.calculate_fine(issue['return_date'], actual_return)

            # If fine was already paid for this issue (e.g. paid while still issued),
            # do not re-assign an unpaid fine on return.
            if issue.get('fine_paid'):
                fine_amount = 0
            
            # Update issue status
            update_data = {
                'status': 'returned',
                'actual_return_date': actual_return,
                'fine_amount': fine_amount,
                'updated_at': get_current_timestamp()
            }
            
            self.update_one({'_id': ObjectId(issue_id)}, update_data)
            
            return {
                'success': True,
                'message': 'Book returned successfully',
                'fine_amount': fine_amount
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def calculate_fine(self, return_date, actual_return_date, fine_per_day=5):
        """Calculate fine for overdue books"""
        try:
            if actual_return_date <= return_date:
                return 0
            
            days_late = (actual_return_date - return_date).days
            fine = days_late * fine_per_day
            
            return fine
        except:
            return 0
    
    def get_overdue_books(self):
        """Get overdue books"""
        today = datetime.now()
        overdue = self.find_many({
            'return_date': {'$lt': today},
            'status': 'issued'
        })
        
        for issue in overdue:
            issue['_id'] = str(issue['_id'])
        
        return overdue
    
    def get_today_issues(self):
        """Get today's issued books"""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        issues = self.find_many({
            'issue_date': {'$gte': today, '$lt': tomorrow},
            'status': 'issued'
        })
        
        for issue in issues:
            issue['_id'] = str(issue['_id'])
        
        return issues
    
    def get_today_returns(self):
        """Get today's returned books"""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        issues = self.find_many({
            'actual_return_date': {'$gte': today, '$lt': tomorrow},
            'status': 'returned'
        })
        
        for issue in issues:
            issue['_id'] = str(issue['_id'])
        
        return issues
    
    def get_member_issued_books(self, member_id):
        """Get all issued books for a member"""
        return self.find_many({
            'member_id': member_id,
            'status': 'issued'
        })
    
    def get_member_all_issues(self, member_id):
        """Get full issue history for a member (issued + returned)"""
        issues = self.find_many({
            'member_id': member_id
        }, limit=1000)
        
        for issue in issues:
            issue['_id'] = str(issue['_id'])
            issue['issue_date'] = issue['issue_date'].isoformat() if issue.get('issue_date') else None
            issue['return_date'] = issue['return_date'].isoformat() if issue.get('return_date') else None
            issue['actual_return_date'] = issue['actual_return_date'].isoformat() if issue.get('actual_return_date') else None
        
        return issues

    def get_member_fines(self, member_id):
        """Get outstanding fines for a member (unpaid returned fines + live overdue fines)

        Returns a list of fine records. A fine is considered 'paid' only when
        the issue has fine_paid=True. Overdue books that are still issued have
        a live (growing) fine that can be paid in advance.
        """
        fines = []
        today = datetime.now()

        issues = self.find_many({'member_id': member_id}, limit=1000)

        for issue in issues:
            fine_amount = float(issue.get('fine_amount') or 0)
            fine_paid = bool(issue.get('fine_paid'))

            # Compute live overdue fine for currently issued books
            live_fine = 0
            if issue.get('status') == 'issued' and issue.get('return_date'):
                try:
                    rd = issue['return_date']
                    if isinstance(rd, str):
                        rd = datetime.fromisoformat(rd)
                    if rd < today:
                        days_late = (today - rd).days
                        live_fine = days_late * 5
                except Exception:
                    live_fine = 0

            if fine_amount > 0 and not fine_paid:
                fines.append({
                    'issue_id': str(issue['_id']),
                    'reason': 'Overdue book return',
                    'amount': fine_amount,
                    'status': 'unpaid',
                    'due_date': issue.get('return_date'),
                    'book_title': self._get_book_title(issue.get('book_id'))
                })
            elif live_fine > 0 and not fine_paid:
                fines.append({
                    'issue_id': str(issue['_id']),
                    'reason': 'Book currently overdue',
                    'amount': live_fine,
                    'status': 'unpaid',
                    'due_date': issue.get('return_date'),
                    'book_title': self._get_book_title(issue.get('book_id'))
                })

        return fines

    def _get_book_title(self, book_id):
        """Get book title for a book_id (small helper)"""
        try:
            from models.Book import Book
            book = Book().get_book(book_id)
            return book['title'] if book else 'Unknown Book'
        except Exception:
            return 'Unknown Book'
    
    def get_statistics(self):
        """Get issue statistics"""
        try:
            return {
                'total_issued': self.count({'status': 'issued'}),
                'total_returned': self.count({'status': 'returned'}),
                'overdue_books': len(self.get_overdue_books()),
                'today_issues': len(self.get_today_issues())
            }
        except:
            return {
                'total_issued': 0,
                'total_returned': 0,
                'overdue_books': 0,
                'today_issues': 0
            }


class Return(BaseRepository):
    """Return model for book returns"""
    
    def __init__(self):
        """Initialize Return repository"""
        super().__init__('returned_books')
    
    def get_all_returns(self, skip=0, limit=10):
        """Get all returned books"""
        returns = self.find_many({}, skip=skip, limit=limit)
        total = self.count({})
        
        for ret in returns:
            ret['_id'] = str(ret['_id'])
        
        return {'returns': returns, 'total': total}
