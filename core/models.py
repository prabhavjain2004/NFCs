from django.contrib.auth.models import AbstractUser
from django.db import models

# Extend User Model
class User(AbstractUser):
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_groups',  # Add this line
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_permissions',  # Add this line
        blank=True
    )

# NFC Card Model
class Card(models.Model):
    card_id = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cards')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    active = models.BooleanField(default=True)

# Transaction Model
class Transaction(models.Model):
    TRANSACTION_TYPES = (('payment', 'Payment'), ('recharge', 'Recharge'), ('settlement', 'Settlement'))
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    card = models.ForeignKey(Card, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
