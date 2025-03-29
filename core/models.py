from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

# Extend User Model
class User(AbstractUser):
    USER_TYPES = (('customer', 'Customer'), ('outlet', 'Outlet'), ('admin', 'Admin'))
    user_type = models.CharField(max_length=10, choices=USER_TYPES, default='customer')
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_groups',
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_permissions',
        blank=True
    )

# Outlet Model
class Outlet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='outlet')
    name = models.CharField(max_length=100)
    address = models.TextField()

# NFC Card Model
class Card(models.Model):
    card_id = models.CharField(max_length=50, unique=True)
    secure_key = models.CharField(max_length=16, unique=True, default=uuid.uuid4().hex[:16])
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cards')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    active = models.BooleanField(default=True)

# Transaction Model
class Transaction(models.Model):
    TRANSACTION_TYPES = (('payment', 'Payment'), ('recharge', 'Recharge'), ('settlement', 'Settlement'))
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    secure_key = models.CharField(max_length=16)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
    outlet = models.ForeignKey(Outlet, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')

# Settlement Model
class Settlement(models.Model):
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name='settlements')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=(('pending', 'Pending'), ('completed', 'Completed')), default='pending')