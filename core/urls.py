from django.urls import path, include
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
    path('api/register/', views.register_user, name='register'),
    path('api/password-reset/request/', views.request_password_reset, name='request-password-reset'),
    path('api/password-reset/reset/', views.reset_password, name='reset-password'),

    # Page routes
    path('', views.home, name='home'),
    path('register/', views.register, name='register-page'),
    path('profile/', views.profile, name='profile'),
    path('privacy/', views.privacy, name='privacy'),
    path('terms/', views.terms, name='terms'),
    path('password-reset/', views.password_reset, name='password-reset'),  # Changed from password-reset-page
    path('transactions/', views.transactions, name='transactions'),

    # Dashboard routes
    path('dashboard/customer/', views.customer_dashboard, name='customer-dashboard'),
    path('dashboard/outlet/', views.outlet_dashboard, name='outlet-dashboard'),
    path('dashboard/admin/', views.admin_dashboard, name='admin-dashboard'),
    path('card-management/', views.card_management, name='card-management'),

    # Error handlers
    path('400/', views.bad_request, name='400'),
    path('403/', views.permission_denied, name='403'),
    path('404/', views.page_not_found, name='404'),
    path('500/', views.server_error, name='500'),
]

# Custom error handlers
handler400 = 'core.views.bad_request'
handler403 = 'core.views.permission_denied'
handler404 = 'core.views.page_not_found'
handler500 = 'core.views.server_error'
