from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserCreationForm
from django import forms
from .models import User, Outlet, Card, Transaction

class CustomUserCreationForm(UserCreationForm):
    name = forms.CharField(max_length=100, required=False)
    address = forms.CharField(max_length=255, required=False)
    business_type = forms.CharField(max_length=50, required=False)
    tax_id = forms.CharField(max_length=50, required=False)

    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ('email', 'user_type')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.user_type = 'outlet'
        if commit:
            user.save()
            if user.user_type == 'outlet':
                Outlet.objects.create(
                    user=user,
                    name=self.cleaned_data.get('name'),
                    address=self.cleaned_data.get('address'),
                    business_type=self.cleaned_data.get('business_type'),
                    tax_id=self.cleaned_data.get('tax_id')
                )
        return user

class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'is_staff')
    list_filter = ('user_type', 'is_staff', 'is_superuser')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('Custom Fields', {'fields': ('user_type',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'user_type'),
        }),
        ('Outlet Information', {
            'classes': ('wide',),
            'fields': ('name', 'address', 'business_type', 'tax_id'),
        }),
    )

admin.site.register(User, CustomUserAdmin)

@admin.register(Outlet)
class OutletAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'business_type', 'user')
    search_fields = ('name', 'address', 'business_type')
    fieldsets = (
        (None, {'fields': ('user', 'name', 'address', 'business_type', 'tax_id')}),
        ('Additional Information', {'fields': ('description', 'active')}),
    )

@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ('card_id', 'secure_key', 'balance', 'active')
    list_filter = ('active',)
    search_fields = ('card_id', 'secure_key')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_type', 'secure_key', 'amount', 'timestamp', 'outlet')
    list_filter = ('transaction_type', 'timestamp')
    search_fields = ('secure_key', 'outlet__name')
