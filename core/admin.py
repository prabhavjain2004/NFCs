
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Outlet, Card, Transaction, Settlement

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'is_staff')
    list_filter = ('user_type', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('user_type',)}),
    )

admin.site.register(User, CustomUserAdmin)

@admin.register(Outlet)
class OutletAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'user')
    search_fields = ('name', 'address')

@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ('card_id', 'secure_key', 'user', 'balance', 'active')
    list_filter = ('active',)
    search_fields = ('card_id', 'secure_key', 'user__username')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_type', 'secure_key', 'amount', 'timestamp', 'outlet')
    list_filter = ('transaction_type', 'timestamp')
    search_fields = ('secure_key', 'outlet__name')

@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ('outlet', 'amount', 'timestamp', 'status')
    list_filter = ('status', 'timestamp')
    search_fields = ('outlet__name',)