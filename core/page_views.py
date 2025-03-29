from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse
import requests
from django.conf import settings
from django.contrib.auth.models import User
from core.models import Outlet

def home(request):
    return render(request, 'core/home.html')

def register(request):
    if request.user.is_authenticated:
        return redirect('home')
    
    if request.method == 'POST':
        # Prepare the data
        data = {
            'username': request.POST.get('username'),
            'email': request.POST.get('email'),
            'password': request.POST.get('password'),
            'user_type': request.POST.get('user_type')
        }

        # Add outlet-specific fields
        if data['user_type'] == 'outlet':
            data.update({
                'name': request.POST.get('name'),
                'address': request.POST.get('address'),
                'business_type': request.POST.get('business_type'),
                'tax_id': request.POST.get('tax_id')
            })

        # Validate user type
        if data['user_type'] != 'outlet':
            messages.error(request, 'Invalid user type')
            return redirect('register')

        # Create user
        try:
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                user_type=data['user_type']
            )

            if data['user_type'] == 'outlet':
                Outlet.objects.create(
                    user=user,
                    name=data['name'],
                    address=data['address'],
                    business_type=data['business_type'],
                    tax_id=data['tax_id']
                )

            messages.success(request, 'Registration successful! Please login.')
            return redirect('login')
        except Exception as e:
            messages.error(request, str(e))
            return redirect('register')

    return render(request, 'core/register.html')

def profile(request):
    if not request.user.is_authenticated:
        return redirect('home')
    return render(request, 'core/profile.html')

def privacy(request):
    return render(request, 'core/privacy.html')

def terms(request):
    return render(request, 'core/terms.html')

def password_reset(request):
    if request.user.is_authenticated:
        return redirect('home')
    return render(request, 'core/password_reset.html')

def transactions(request):
    if not request.user.is_authenticated:
        return redirect('home')
    return render(request, 'core/transactions.html')

def customer_transactions(request):
    if not request.user.is_authenticated or request.user.user_type != 'customer':
        return redirect('home')
    return render(request, 'core/transactions.html', {'user_type': 'customer'})

def outlet_transactions(request):
    if not request.user.is_authenticated or request.user.user_type != 'outlet':
        return redirect('home')
    return render(request, 'core/transactions.html', {'user_type': 'outlet'})

def admin_users(request):
    if not request.user.is_authenticated or request.user.user_type != 'admin':
        return redirect('home')
    return render(request, 'core/admin/users.html')

def admin_settlements(request):
    if not request.user.is_authenticated or request.user.user_type != 'admin':
        return redirect('home')
    return render(request, 'core/admin/settlements.html')

def outlet_settlements(request):
    if not request.user.is_authenticated or request.user.user_type != 'outlet':
        return redirect('home')
    return render(request, 'core/outlet/settlements.html')

def customer_dashboard(request):
    if not request.user.is_authenticated or request.user.user_type != 'customer':
        return redirect('home')
    return render(request, 'core/dashboard/customer_dashboard.html')

def outlet_dashboard(request):
    if not request.user.is_authenticated or request.user.user_type != 'outlet':
        return redirect('home')
    return render(request, 'core/dashboard/outlet_dashboard.html')

def admin_dashboard(request):
    if not request.user.is_authenticated or request.user.user_type != 'admin':
        return redirect('home')
    return render(request, 'core/dashboard/admin_dashboard.html')

def card_management(request):
    if not request.user.is_authenticated or request.user.user_type != 'admin':
        return redirect('home')
    return render(request, 'core/card_management.html')
