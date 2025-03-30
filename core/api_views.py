from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum
import uuid
import csv
from django.http import HttpResponse

from .models import User, Outlet, Card, Transaction, OutletSummary

# ViewSets for API endpoints
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Admin can see all users, outlets can only see themselves
        if self.request.user.user_type == 'admin':
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

class OutletViewSet(viewsets.ModelViewSet):
    queryset = Outlet.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Admin can see all outlets, outlets can only see themselves
        if self.request.user.user_type == 'admin':
            return Outlet.objects.all()
        if hasattr(self.request.user, 'outlet'):
            return Outlet.objects.filter(id=self.request.user.outlet.id)
        return Outlet.objects.none()

class CardViewSet(viewsets.ModelViewSet):
    queryset = Card.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer(self, *args, **kwargs):
        """
        Include secure_key in the serializer fields for admin users
        """
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', self.get_serializer_context())
        
        # If user is admin, include secure_key in the fields
        if self.request.user.user_type == 'admin':
            class AdminCardSerializer(serializer_class):
                class Meta(serializer_class.Meta):
                    fields = serializer_class.Meta.fields + ['secure_key']
            
            return AdminCardSerializer(*args, **kwargs)
        
        return serializer_class(*args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def issue(self, request):
        """Issue a new NFC card"""
        try:
            # Get data from request
            initial_balance = request.data.get('initial_balance', 0)
            customer_name = request.data.get('customer_name', '')
            customer_mobile = request.data.get('customer_mobile', '')
            nfc_card_id = request.data.get('nfc_card_id', '')
            
            # Use the NFC card ID as the secure key if provided, otherwise generate one
            if nfc_card_id:
                secure_key = nfc_card_id
                card_id = f"CARD{nfc_card_id[-8:].upper()}"
            else:
                # Generate a unique card ID and secure key
                card_id = f"CARD{uuid.uuid4().hex[:8].upper()}"
                secure_key = uuid.uuid4().hex
            
            # Create the card
            card = Card.objects.create(
                card_id=card_id,
                secure_key=secure_key,
                balance=initial_balance,
                customer_name=customer_name,
                customer_mobile=customer_mobile,
                active=True
            )
            
            # Create a top-up transaction if initial balance > 0
            if float(initial_balance) > 0:
                Transaction.objects.create(
                    transaction_type='topup',
                    secure_key=secure_key,
                    amount=initial_balance,
                    status='completed',
                    description=f"Initial top-up for card {card_id}"
                )
            
            return Response({
                'success': True,
                'card_id': card_id,
                'message': 'Card issued successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def topup(self, request, pk=None):
        """Top up a card's balance"""
        try:
            card = self.get_object()
            amount = float(request.data.get('amount', 0))
            
            if amount <= 0:
                return Response({
                    'success': False,
                    'error': 'Amount must be greater than zero'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update card balance
            card.balance += amount
            card.last_used = timezone.now()
            card.save()
            
            # Create transaction record
            transaction = Transaction.objects.create(
                transaction_type='topup',
                secure_key=card.secure_key,
                amount=amount,
                status='completed',
                description=f"Top-up for card {card.card_id}"
            )
            
            return Response({
                'success': True,
                'transaction_id': transaction.transaction_id,
                'new_balance': card.balance,
                'message': 'Top-up successful'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by('-timestamp')
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Filter transactions based on user type
        if self.request.user.user_type == 'admin':
            return Transaction.objects.all().order_by('-timestamp')
        elif self.request.user.user_type == 'outlet' and hasattr(self.request.user, 'outlet'):
            return Transaction.objects.filter(outlet=self.request.user.outlet).order_by('-timestamp')
        return Transaction.objects.none()
    
    @action(detail=False, methods=['post'])
    def payment(self, request):
        """Process a payment transaction"""
        try:
            # Get data from request
            secure_key = request.data.get('secure_key')
            amount = float(request.data.get('amount', 0))
            
            # Validate data
            if not secure_key:
                return Response({
                    'success': False,
                    'error': 'Card secure key is required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if amount <= 0:
                return Response({
                    'success': False,
                    'error': 'Amount must be greater than zero'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the card
            try:
                card = Card.objects.get(secure_key=secure_key)
            except Card.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Invalid card'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if card is active
            if not card.active:
                return Response({
                    'success': False,
                    'error': 'Card is inactive'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if card has sufficient balance
            if card.balance < amount:
                return Response({
                    'success': False,
                    'error': 'Insufficient balance'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the outlet (if outlet user)
            outlet = None
            if self.request.user.user_type == 'outlet' and hasattr(self.request.user, 'outlet'):
                outlet = self.request.user.outlet
            
            # Create transaction
            transaction = Transaction.objects.create(
                transaction_type='payment',
                secure_key=secure_key,
                amount=amount,
                outlet=outlet,
                status='completed',
                description=request.data.get('description', 'Payment transaction')
            )
            
            # Update card balance
            card.balance -= amount
            card.last_used = timezone.now()
            card.save()
            
            # Update outlet summary if applicable
            if outlet:
                summary, created = OutletSummary.objects.get_or_create(outlet=outlet)
                summary.update_summary()
            
            return Response({
                'success': True,
                'transaction_id': transaction.transaction_id,
                'new_balance': card.balance,
                'message': 'Payment successful'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export transactions as CSV"""
        # Get transactions based on user type
        transactions = self.get_queryset()
        
        # Create the HttpResponse with CSV header
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="transactions.csv"'
        
        # Create CSV writer
        writer = csv.writer(response)
        writer.writerow([
            'Transaction ID', 
            'Date & Time', 
            'Type', 
            'Amount', 
            'Status', 
            'Outlet', 
            'Description'
        ])
        
        # Add transaction data
        for transaction in transactions:
            writer.writerow([
                transaction.transaction_id,
                transaction.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                transaction.get_transaction_type_display(),
                transaction.amount,
                transaction.get_status_display(),
                transaction.outlet.name if transaction.outlet else 'N/A',
                transaction.description or ''
            ])
        
        return response
