from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Count
from django.utils import timezone
from django.http import HttpResponse
from django.contrib import messages
from datetime import timedelta

from .models import User, Outlet, Card, Transaction, OutletSummary

def home(request):
    """Home page view"""
    # If user is logged in, redirect to appropriate dashboard
    if request.user.is_authenticated:
        if request.user.user_type == 'admin':
            return redirect('admin-dashboard')
        elif request.user.user_type == 'outlet':
            return redirect('outlet-dashboard')
    
    return render(request, 'core/home.html')

@login_required
def transactions(request):
    """View for all transactions (admin view)"""
    if request.user.user_type != 'admin':
        messages.error(request, "You don't have permission to access this page.")
        return redirect('home')
    
    transactions = Transaction.objects.all().order_by('-timestamp')
    
    context = {
        'transactions': transactions
    }
    
    return render(request, 'core/transactions.html', context)

@login_required
def outlet_transactions(request):
    """View for outlet-specific transactions"""
    if request.user.user_type != 'outlet' or not hasattr(request.user, 'outlet'):
        messages.error(request, "You don't have permission to access this page.")
        return redirect('home')
    
    transactions = Transaction.objects.filter(outlet=request.user.outlet).order_by('-timestamp')
    
    context = {
        'transactions': transactions
    }
    
    return render(request, 'core/transactions.html', context)

@login_required
def admin_dashboard(request):
    """Admin dashboard view"""
    if request.user.user_type != 'admin':
        messages.error(request, "You don't have permission to access this page.")
        return redirect('home')
    
    # Get statistics for dashboard
    stats = {
        'total_cards': Card.objects.count(),
        'active_outlets': Outlet.objects.filter(active=True).count(),
        'total_transactions': Transaction.objects.count(),
        'total_revenue': Transaction.objects.filter(transaction_type='payment', status='completed').aggregate(Sum('amount'))['amount__sum'] or 0
    }
    
    # Get outlets with their summaries
    outlets = Outlet.objects.all()
    
    # Ensure all outlets have summaries
    for outlet in outlets:
        summary, created = OutletSummary.objects.get_or_create(outlet=outlet)
        if created or (timezone.now() - summary.last_updated) > timedelta(hours=1):
            summary.update_summary()
    
    context = {
        'stats': stats,
        'outlets': outlets
    }
    
    return render(request, 'core/dashboard/admin_dashboard.html', context)

@login_required
def outlet_dashboard(request):
    """Outlet dashboard view"""
    if request.user.user_type != 'outlet' or not hasattr(request.user, 'outlet'):
        messages.error(request, "You don't have permission to access this page.")
        return redirect('home')
    
    outlet = request.user.outlet
    
    # Get or create outlet summary
    summary, created = OutletSummary.objects.get_or_create(outlet=outlet)
    if created or (timezone.now() - summary.last_updated) > timedelta(hours=1):
        summary.update_summary()
    
    # Get recent transactions
    recent_transactions = Transaction.objects.filter(outlet=outlet).order_by('-timestamp')[:10]
    
    context = {
        'outlet': outlet,
        'summary': summary,
        'recent_transactions': recent_transactions
    }
    
    return render(request, 'core/dashboard/outlet_dashboard.html', context)

@login_required
def card_management(request):
    """Card management view for admins"""
    if request.user.user_type != 'admin':
        messages.error(request, "You don't have permission to access this page.")
        return redirect('home')
    
    context = {}
    
    return render(request, 'core/card_management.html', context)
