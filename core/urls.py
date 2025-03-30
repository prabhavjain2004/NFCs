from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .api_views import UserViewSet, OutletViewSet, CardViewSet, TransactionViewSet

# Create a router for API views
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'outlets', OutletViewSet)
router.register(r'cards', CardViewSet)
router.register(r'transactions', TransactionViewSet)

urlpatterns = [
    # Page views
    path('', views.home, name='home'),
    path('transactions/', views.transactions, name='transactions'),
    path('outlet/transactions/', views.outlet_transactions, name='outlet-transactions'),
    path('outlet/dashboard/', views.outlet_dashboard, name='outlet-dashboard'),
    path('admin/dashboard/', views.admin_dashboard, name='admin-dashboard'),
    path('admin/cards/', views.card_management, name='card-management'),
    
    # API endpoints
    path('api/', include(router.urls)),
    path('export-transactions/', TransactionViewSet.as_view({'get': 'export_csv'}), name='export_transactions'),
    
    # Authentication URLs (provided by Django)
    path('accounts/', include('django.contrib.auth.urls')),
]
