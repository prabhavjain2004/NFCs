from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import uuid

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('admin', 'Admin'),
        ('outlet', 'Outlet'),
    )
    
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='outlet')
    phone = models.CharField(max_length=15, blank=True, null=True)
    
    def __str__(self):
        return self.username

class Outlet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='outlet')
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True, null=True)
    business_type = models.CharField(max_length=50, default='general')
    tax_id = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class OutletSummary(models.Model):
    outlet = models.OneToOneField(Outlet, on_delete=models.CASCADE, related_name='summary')
    total_transactions = models.IntegerField(default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_items_sold = models.IntegerField(default=0)
    last_transaction_date = models.DateTimeField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    def update_summary(self):
        """Update the summary based on transactions"""
        from .models import Transaction
        
        transactions = Transaction.objects.filter(outlet=self.outlet)
        
        self.total_transactions = transactions.count()
        self.total_amount = transactions.aggregate(models.Sum('amount'))['amount__sum'] or 0
        
        # Assuming each transaction is one item for simplicity
        self.total_items_sold = self.total_transactions
        
        # Get the latest transaction date
        latest = transactions.order_by('-timestamp').first()
        if latest:
            self.last_transaction_date = latest.timestamp
        
        self.save()
    
    def __str__(self):
        return f"Summary for {self.outlet.name}"

class Card(models.Model):
    card_id = models.CharField(max_length=50, unique=True)
    secure_key = models.CharField(max_length=100, unique=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    customer_name = models.CharField(max_length=100, blank=True, null=True)
    customer_mobile = models.CharField(max_length=15, blank=True, null=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(blank=True, null=True)
    is_nfc = models.BooleanField(default=False)
    
    def __str__(self):
        return self.card_id

class Transaction(models.Model):
    TRANSACTION_TYPE_CHOICES = (
        ('payment', 'Payment'),
        ('topup', 'Top-up'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    
    transaction_id = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    secure_key = models.CharField(max_length=100)  # Card's secure key
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    outlet = models.ForeignKey(Outlet, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.transaction_id
