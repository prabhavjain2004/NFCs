from django.shortcuts import render, redirect

def home(request):
    return render(request, 'core/home.html')

def register(request):
    if request.user.is_authenticated:
        return redirect('home')
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
