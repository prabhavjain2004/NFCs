from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid
from django.utils import timezone
from django.core.validators import MinValueValidator
from cryptography.fernet import Fernet
from django.conf import settings

class User(AbstractUser):
    USER_TYPES = (('outlet', 'Outlet'), ('admin', 'Admin'))
    user_type = models.CharField(max_length=10, choices=USER_TYPES, default='outlet')
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
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    phone_number = models.CharField(max_length=15, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def lock_account(self, duration_minutes=30):
        self.account_locked_until = timezone.now() + timezone.timedelta(minutes=duration_minutes)
        self.save()

    def is_account_locked(self):
        if self.account_locked_until and self.account_locked_until > timezone.now():
            return True
        return False

class Outlet(models.Model):
    BUSINESS_TYPES = (
        ('retail', 'Retail'),
        ('restaurant', 'Restaurant'),
        ('service', 'Service'),
        ('other', 'Other')
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='outlet')
    name = models.CharField(max_length=100)
    address = models.TextField(null=True, blank=True)
    contact_person = models.CharField(max_length=100, null=True, blank=True)
    contact_phone = models.CharField(max_length=15, null=True, blank=True)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES, null=True, blank=True)
    registration_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    verification_document_number = models.CharField(max_length=100, null=True, blank=True)
    verification_document_type = models.CharField(max_length=50, null=True, blank=True)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.business_type:
            self.business_type = 'other'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.registration_number if self.registration_number else 'Unregistered'})"

class Card(models.Model):
    card_id = models.CharField(max_length=50, unique=True)
    secure_key = models.CharField(max_length=16, unique=True, default=uuid.uuid4().hex[:16])
    balance = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00,
        validators=[MinValueValidator(0.00)]
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)
    customer_name = models.CharField(max_length=255, default='Unknown Customer')
    customer_mobile = models.CharField(max_length=15, default='0000000000')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cards')

    def __str__(self):
        return f"Card {self.card_id}"

    def encrypt_data(self, data):
        key = settings.ENCRYPTION_KEY
        fernet = Fernet(key)
        return fernet.encrypt(data.encode())

    def decrypt_data(self, encrypted_data):
        key = settings.ENCRYPTION_KEY
        fernet = Fernet(key)
        return fernet.decrypt(encrypted_data).decode()

    def save(self, *args, **kwargs):
        if self.customer_mobile:
            self.customer_mobile = self.encrypt_data(self.customer_mobile)
        super().save(*args, **kwargs)

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('payment', 'Payment'),
        ('recharge', 'Recharge'),
        ('settlement', 'Settlement'),
        ('refund', 'Refund'),
        ('reversal', 'Reversal')
    )
    TRANSACTION_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('reversed', 'Reversed'),
        ('refunded', 'Refunded')
    )
    
    transaction_id = models.UUIDField(default=uuid.uuid4, unique=True)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    secure_key = models.CharField(max_length=16)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(default=timezone.now)
    outlet = models.ForeignKey(Outlet, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    status = models.CharField(max_length=10, choices=TRANSACTION_STATUS, default='pending')
    reference_id = models.UUIDField(null=True, blank=True)  # For refunds/reversals
    description = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_info = models.JSONField(default=dict)
    location = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} - {self.timestamp}"

class Settlement(models.Model):
    SETTLEMENT_STATUS = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    )
    
    settlement_id = models.UUIDField(default=uuid.uuid4, unique=True)
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name='settlements')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=SETTLEMENT_STATUS, default='pending')
    transactions = models.ManyToManyField(Transaction, related_name='settlements')
    settlement_date = models.DateTimeField(null=True, blank=True)
    settlement_reference = models.CharField(max_length=100, null=True, blank=True)
    bank_account = models.JSONField(default=dict)
    settlement_batch = models.CharField(max_length=50, null=True, blank=True)
    failure_reason = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Settlement {self.settlement_id} - {self.outlet.name}"

class AuditLog(models.Model):
    ACTION_TYPES = (
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('block', 'Block'),
        ('unblock', 'Unblock')
    )
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=10, choices=ACTION_TYPES)
    entity_type = models.CharField(max_length=50)  # 'user', 'card', 'transaction', etc.
    entity_id = models.CharField(max_length=50)
    timestamp = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    details = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.action} on {self.entity_type} by {self.user}"

class SecurityAlert(models.Model):
    ALERT_TYPES = (
        ('suspicious_login', 'Suspicious Login'),
        ('multiple_failed_attempts', 'Multiple Failed Attempts'),
        ('unusual_transaction', 'Unusual Transaction'),
        ('high_value_transaction', 'High Value Transaction'),
        ('multiple_transactions', 'Multiple Transactions'),
        ('location_mismatch', 'Location Mismatch')
    )
    
    ALERT_STATUS = (
        ('new', 'New'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive')
    )
    
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='security_alerts')
    timestamp = models.DateTimeField(default=timezone.now)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=ALERT_STATUS, default='new')
    resolution_notes = models.TextField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='resolved_alerts')
    resolved_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.alert_type} - {self.user.username}"
