"""
Fine Payment Model for Library Management System
Handles online fine payments made by Students & Teachers
and the librarian's payment confirmation flow.
"""
from database.mongodb import BaseRepository, get_current_timestamp, mongo
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import uuid


class FinePayment(BaseRepository):
    """Fine payment model"""

    def __init__(self):
        """Initialize FinePayment repository"""
        super().__init__('fine_payments')

    def generate_payment_id(self):
        """Generate unique payment ID"""
        return 'PAY' + str(uuid.uuid4().hex[:8]).upper()

    def generate_transaction_id(self):
        """Generate unique transaction ID"""
        return 'TXN' + str(uuid.uuid4().hex[:10]).upper()

    def create_payment(self, member_id, issue_ids, amount, payment_method, transaction_id=None):
        """Record a payment initiated by a member through the payment gateway

        Status: 'pending' until the librarian confirms the payment.
        """
        try:
            # Get member details for reference
            member = mongo.db.members.find_one({'_id': ObjectId(member_id)})
            member_name = member.get('name', '') if member else ''

            payment = {
                'payment_id': self.generate_payment_id(),
                'transaction_id': transaction_id or self.generate_transaction_id(),
                'member_id': member_id,
                'member_name': member_name,
                'issue_ids': issue_ids,
                'amount': float(amount),
                'payment_method': payment_method,
                'status': 'pending',  # pending -> confirmed
                'paid_at': get_current_timestamp(),
                'confirmed_at': None,
                'confirmed_by': None,
                'created_at': get_current_timestamp(),
                'updated_at': get_current_timestamp()
            }

            payment_id = self.insert_one(payment)
            return {
                'success': True,
                'message': 'Payment recorded successfully',
                'payment_id': str(payment_id)
            }

        except Exception as e:
            return {'success': False, 'message': str(e)}

    def get_payment(self, payment_id):
        """Get payment by ID"""
        try:
            payment = self.find_one({'_id': ObjectId(payment_id)})
            if payment:
                payment['_id'] = str(payment['_id'])
                return payment
            return None
        except:
            return None

    def get_member_payments(self, member_id):
        """Get all payments made by a member"""
        payments = self.find_many({'member_id': member_id}, limit=1000)
        for payment in payments:
            payment['_id'] = str(payment['_id'])
        return payments

    def get_all_payments(self, skip=0, limit=10, status=None, search_query=None):
        """Get all payments with pagination and filtering"""
        query = {}

        if status:
            query['status'] = status

        if search_query:
            query['$or'] = [
                {'member_name': {'$regex': search_query, '$options': 'i'}},
                {'payment_id': search_query},
                {'transaction_id': search_query}
            ]

        payments = self.find_many(query, skip=skip, limit=limit)
        total = self.count(query)

        for payment in payments:
            payment['_id'] = str(payment['_id'])

        return {'payments': payments, 'total': total}

    def confirm_payment(self, payment_id, admin_id):
        """Confirm a pending payment (librarian action)

        When confirmed:
        - Payment status becomes 'confirmed'
        - Linked issues are marked fine_paid=True so the fine
          no longer appears in the student/teacher section.
        """
        try:
            payment = self.find_one({'_id': ObjectId(payment_id)})

            if not payment:
                return {'success': False, 'message': 'Payment not found'}

            if payment['status'] != 'pending':
                return {'success': False, 'message': 'Only pending payments can be confirmed'}

            # Update payment status
            self.update_one({'_id': ObjectId(payment_id)}, {
                'status': 'confirmed',
                'confirmed_at': get_current_timestamp(),
                'confirmed_by': admin_id,
                'updated_at': get_current_timestamp()
            })

            # Mark linked issues as fine_paid
            for issue_id in (payment.get('issue_ids') or []):
                try:
                    mongo.db.issued_books.update_one(
                        {'_id': ObjectId(issue_id)},
                        {'$set': {'fine_paid': True, 'updated_at': get_current_timestamp()}}
                    )
                except Exception:
                    pass

            return {
                'success': True,
                'message': 'Payment confirmed successfully. Fine cleared from member section.'
            }

        except Exception as e:
            return {'success': False, 'message': str(e)}

    def get_statistics(self):
        """Get payment statistics for librarian dashboard"""
        try:
            pending = self.find_many({'status': 'pending'}, limit=10000)
            confirmed = self.find_many({'status': 'confirmed'}, limit=10000)

            total_confirmed_amount = sum(p.get('amount', 0) for p in confirmed)
            total_pending_amount = sum(p.get('amount', 0) for p in pending)

            return {
                'total_payments': self.count({}),
                'pending_count': len(pending),
                'confirmed_count': len(confirmed),
                'total_confirmed_amount': total_confirmed_amount,
                'total_pending_amount': total_pending_amount,
                'total_amount': total_confirmed_amount + total_pending_amount
            }
        except Exception:
            return {
                'total_payments': 0,
                'pending_count': 0,
                'confirmed_count': 0,
                'total_confirmed_amount': 0,
                'total_pending_amount': 0,
                'total_amount': 0
            }

