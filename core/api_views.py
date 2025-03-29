from django.contrib.auth import authenticate
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Outlet, Card, Transaction, Settlement
from django.db.models import Sum, Count
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
import uuid
from django.db import transaction

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user (customer or outlet)
    """
    try:
        with transaction.atomic():
            # Extract common fields
            username = request.data.get('username')
            email = request.data.get('email')
            password = request.data.get('password')
            user_type = request.data.get('user_type')

            # Validate required fields
            if not all([username, email, password, user_type]):
                return Response({
                    'error': 'Missing required fields',
                    'required': ['username', 'email', 'password', 'user_type']
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate user type
            if user_type not in ['customer', 'outlet']:
                return Response({
                    'error': 'Invalid user type. Must be either "customer" or "outlet"'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if username exists
            if User.objects.filter(username=username).exists():
                return Response({
                    'error': 'Username already exists'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if email exists
            if User.objects.filter(email=email).exists():
                return Response({
                    'error': 'Email already exists'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create user object
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                user_type=user_type
            )

            if user_type == 'customer':
                # Update customer fields
                user.first_name = request.data.get('first_name', '')
                user.last_name = request.data.get('last_name', '')
                user.phone_number = request.data.get('phone_number', '')
                user.save()
            
            elif user_type == 'outlet':
                # Validate required outlet fields
                outlet_fields = ['name', 'address', 'business_type', 'tax_id']
                if not all(request.data.get(field) for field in outlet_fields):
                    user.delete()  # Rollback user creation
                    return Response({
                        'error': 'Missing required outlet fields',
                        'required': outlet_fields
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Validate business type
                business_type = request.data.get('business_type')
                valid_business_types = dict(Outlet.BUSINESS_TYPES).keys()
                if business_type not in valid_business_types:
                    user.delete()  # Rollback user creation
                    return Response({
                        'error': 'Invalid business type',
                        'valid_types': list(valid_business_types)
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Create outlet
                Outlet.objects.create(
                    user=user,
                    name=request.data.get('name'),
                    address=request.data.get('address'),
                    business_type=request.data.get('business_type'),
                    tax_id=request.data.get('tax_id')
                )

            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'message': 'Registration successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'user_type': user.user_type
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token)
                }
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({
            'error': 'Registration failed',
            'detail': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get('email')
    try:
        user = User.objects.get(email=email)
        token = str(uuid.uuid4())
        user.password_reset_token = token
        user.password_reset_expires = timezone.now() + timedelta(hours=24)
        user.save()
        
        # TODO: Send email with reset link
        return Response({'message': 'Password reset instructions sent to your email'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
    try:
        user = User.objects.get(
            password_reset_token=token,
            password_reset_expires__gt=timezone.now()
        )
        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        user.save()
        return Response({'message': 'Password reset successful'})
    except User.DoesNotExist:
        return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_type': user.user_type
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        user = request.user
        try:
            if user.user_type == 'customer':
                user.first_name = request.data.get('first_name', user.first_name)
                user.last_name = request.data.get('last_name', user.last_name)
                user.email = request.data.get('email', user.email)
                user.phone = request.data.get('phone', user.phone)
            elif user.user_type == 'outlet':
                outlet = user.outlet
                outlet.name = request.data.get('outlet_name', outlet.name)
                outlet.address = request.data.get('address', outlet.address)
                outlet.save()
            
            user.save()
            return Response({'message': 'Profile updated successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully'})

class OutletViewSet(viewsets.ModelViewSet):
    queryset = Outlet.objects.all()
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def summary(self, request):
        outlet = request.user.outlet
        today = timezone.now().date()
        
        today_transactions = Transaction.objects.filter(
            outlet=outlet,
            timestamp__date=today
        )
        
        return Response({
            'today_transactions': today_transactions.count(),
            'today_revenue': today_transactions.aggregate(Sum('amount'))['amount__sum'] or 0,
            'pending_settlement': today_transactions.filter(settled=False).aggregate(Sum('amount'))['amount__sum'] or 0
        })

class CardViewSet(viewsets.ModelViewSet):
    queryset = Card.objects.all()
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def recharge(self, request, pk=None):
        card = self.get_object()
        amount = Decimal(request.data.get('amount', 0))
        if amount <= 0:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
        card.balance += amount
        card.save()
        Transaction.objects.create(
            transaction_type='recharge',
            secure_key=card.secure_key,
            amount=amount
        )
        return Response({'message': 'Recharge successful', 'new_balance': card.balance})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def issue(self, request):
        initial_balance = Decimal(request.data.get('initial_balance', 0))
        secure_key = str(uuid.uuid4().hex)[:16]
        card_id = str(uuid.uuid4().hex)[:8].upper()  # Generate a random 8-character card ID
        
        try:
            card = Card.objects.create(
                card_id=card_id,
                secure_key=secure_key,
                balance=initial_balance,
                active=True
            )
            
            return Response({
                'message': 'Card issued successfully',
                'card_id': card.id,
                'secure_key': secure_key
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def make_payment(self, request):
        secure_key = request.data.get('secure_key')
        amount = Decimal(request.data.get('amount', 0))
        outlet_id = request.data.get('outlet_id')

        try:
            card = Card.objects.get(secure_key=secure_key)
            outlet = Outlet.objects.get(id=outlet_id)
        except (Card.DoesNotExist, Outlet.DoesNotExist):
            return Response({'error': 'Invalid card or outlet'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0 or card.balance < amount:
            return Response({'error': 'Invalid amount or insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

        card.balance -= amount
        card.save()

        Transaction.objects.create(
            transaction_type='payment',
            secure_key=secure_key,
            amount=amount,
            outlet=outlet
        )

        return Response({'message': 'Payment successful', 'new_balance': card.balance})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def history(self, request):
        user = request.user
        if user.user_type == 'customer':
            transactions = Transaction.objects.filter(secure_key__in=user.cards.values_list('secure_key', flat=True))
        elif user.user_type == 'outlet':
            transactions = Transaction.objects.filter(outlet=user.outlet)
        else:
            transactions = Transaction.objects.all()

        return Response(self.get_serializer(transactions, many=True).data)

class SettlementViewSet(viewsets.ModelViewSet):
    queryset = Settlement.objects.all()
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def settle_outlet(self, request):
        outlet_id = request.data.get('outlet_id')
        try:
            outlet = Outlet.objects.get(id=outlet_id)
        except Outlet.DoesNotExist:
            return Response({'error': 'Invalid outlet'}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = Transaction.objects.filter(outlet=outlet, transaction_type='payment').aggregate(Sum('amount'))['amount__sum'] or 0
        
        if total_amount > 0:
            settlement = Settlement.objects.create(
                outlet=outlet,
                amount=total_amount,
                status='completed'
            )
            return Response({'message': 'Settlement completed', 'amount': total_amount, 'settlement_id': settlement.id})
        else:
            return Response({'message': 'No transactions to settle'})

class AdminDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def system_analytics(self, request):
        total_users = User.objects.count()
        total_outlets = Outlet.objects.count()
        total_cards = Card.objects.count()
        total_transactions = Transaction.objects.count()
        total_transaction_amount = Transaction.objects.aggregate(Sum('amount'))['amount__sum'] or 0

        # Daily transaction trends
        today = timezone.now().date()
        last_week = today - timedelta(days=7)
        daily_transactions = Transaction.objects.filter(
            timestamp__date__gte=last_week
        ).values('timestamp__date').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('timestamp__date')

        return Response({
            'total_users': total_users,
            'total_outlets': total_outlets,
            'total_cards': total_cards,
            'total_transactions': total_transactions,
            'total_transaction_amount': total_transaction_amount,
            'daily_trends': daily_transactions
        })
