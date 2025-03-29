from django.shortcuts import render

def bad_request(request, exception=None):
    context = {
        'error_code': 400,
        'error_message': 'Bad Request',
        'error_description': 'The server could not understand your request. Please check your input and try again.'
    }
    return render(request, 'core/errors/400.html', context, status=400)

def permission_denied(request, exception=None):
    context = {
        'error_code': 403,
        'error_message': 'Permission Denied',
        'error_description': 'You do not have permission to access this resource. Please log in with appropriate credentials.'
    }
    return render(request, 'core/errors/403.html', context, status=403)

def page_not_found(request, exception=None):
    context = {
        'error_code': 404,
        'error_message': 'Page Not Found',
        'error_description': 'The page you are looking for could not be found. Please check the URL and try again.'
    }
    return render(request, 'core/errors/404.html', context, status=404)

def server_error(request):
    context = {
        'error_code': 500,
        'error_message': 'Internal Server Error',
        'error_description': 'An unexpected error occurred. Our team has been notified and is working to fix the issue.'
    }
    return render(request, 'core/errors/500.html', context, status=500)
