from .error_handlers import (
    bad_request,
    permission_denied,
    page_not_found,
    server_error
)

from .page_views import (
    home,
    profile,
    privacy,
    terms,
    password_reset,
    transactions,
    outlet_dashboard,
    admin_dashboard,
    card_management,
    outlet_transactions,
    admin_users,
    admin_settlements,
    outlet_settlements
)

from .api_views import (
    request_password_reset,
    reset_password,
    UserViewSet,
    OutletViewSet,
    CardViewSet,
    TransactionViewSet,
    SettlementViewSet,
    AdminDashboardViewSet
)

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth import get_user_model

# Export all views
__all__ = [
    # Error Handlers
    'bad_request',
    'permission_denied',
    'page_not_found',
    'server_error',
    
    # Page Views
    'home',
    'profile',
    'privacy',
    'terms',
    'password_reset',
    'transactions',
    'outlet_dashboard',
    'admin_dashboard',
    'card_management',
    'outlet_transactions',
    'admin_users',
    'admin_settlements',
    'outlet_settlements',
    
    # API Views
    'request_password_reset',
    'reset_password',
    'UserViewSet',
    'OutletViewSet',
    'CardViewSet',
    'TransactionViewSet',
    'SettlementViewSet',
    'AdminDashboardViewSet'
]

def home(request):
    return render(request, 'core/home.html')

def admin_users(request):
    users = get_user_model().objects.all()
    return render(request, 'core/admin_users.html', {'users': users})

def admin_settlements(request):
    # Add your logic here
    return render(request, 'core/admin_settlements.html')

def about(request):
    return render(request, 'core/about.html')

def contact(request):
    return render(request, 'core/contact.html')

def faq(request):
    return render(request, 'core/faq.html')

def help(request):
    return render(request, 'core/help.html')
