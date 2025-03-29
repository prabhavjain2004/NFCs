from django.urls import path, include
from django.contrib.auth import views as auth_views  # Import auth views
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for API viewsets
router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'outlets', views.OutletViewSet)
router.register(r'cards', views.CardViewSet)
router.register(r'transactions', views.TransactionViewSet)
router.register(r'settlements', views.SettlementViewSet)
router.register(r'admin-dashboard', views.AdminDashboardViewSet, basename='admin-dashboard')

urlpatterns = [
    # API endpoints
    path('api/', include(router.urls)),
    path('api/password-reset/request/', views.request_password_reset, name='request-password-reset'),
    path('api/password-reset/reset/', views.reset_password, name='reset-password'),

    # Page routes
    path('', views.home, name='home'),
    path('profile/', views.profile, name='profile'),
    path('privacy/', views.privacy, name='privacy'),
    path('terms/', views.terms, name='terms'),
    path('password-reset/', views.password_reset, name='password-reset'),

    # Role-specific transaction routes
    path('transactions/outlet/', views.outlet_transactions, name='outlet-transactions'),
    path('transactions/', views.transactions, name='transactions'),

    # Dashboard routes
    path('dashboard/outlet/', views.outlet_dashboard, name='outlet-dashboard'),
    path('dashboard/admin/', views.admin_dashboard, name='admin-dashboard'),
    
    # Admin routes
    path('admin/users/', views.admin_users, name='admin-users'),
    path('admin/settlements/', views.admin_settlements, name='admin-settlements'),
    path('card-management/', views.card_management, name='card-management'),
    
    # Outlet routes
    path('outlet/settlements/', views.outlet_settlements, name='outlet-settlements'),

    # Error handlers
    path('400/', views.bad_request, name='400'),

    # Add the logout URL pattern
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),

    # Add the login URL pattern
    path('login/', auth_views.LoginView.as_view(template_name='core/login.html'), name='login'),

    # Add the about URL pattern
    path('about/', views.about, name='about'),

    # Add the contact URL pattern
    path('contact/', views.contact, name='contact'),

    # Add the FAQ URL pattern
    path('faq/', views.faq, name='faq'),

    # Add the Help Center URL pattern
    path('help/', views.help, name='help'),
]

# Custom error handlers
handler400 = 'core.views.bad_request'
handler403 = 'core.views.permission_denied'
handler404 = 'core.views.page_not_found'
handler500 = 'core.views.server_error'
