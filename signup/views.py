from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from django.views.generic import View
import logging
from django.conf import settings

# Set up logging for security monitoring
logger = logging.getLogger(__name__)

# Create your views here.
def sehatsaarthi_view(request):
    return render(request, 'sehatsaarthi.html')

@csrf_protect
@never_cache
def login_view(request):
    # Redirect if user is already logged in
    if request.user.is_authenticated:
        if request.user.is_staff:
            return redirect('/admin_dashboard')
        return redirect('/sehatsaarthi')
    
    if request.method == "POST":
        email = request.POST['email']
        password = request.POST['password']
        
        try:
            user = User.objects.get(email=email)
            user = authenticate(username=user.username, password=password)
            
            if user is not None:
                login(request, user)  # Login user first
                
                # Log security events
                logger.info(f'User {user.username} logged in from {request.META.get("REMOTE_ADDR")}')
                
                if user.is_staff:
                    # Additional logging for admin access
                    logger.warning(f'Admin user {user.username} accessed admin dashboard from {request.META.get("REMOTE_ADDR")}')
                    messages.success(request, f'Welcome back, Admin {user.first_name}!')
                    return redirect('/sehatsaarthi')
                else:
                    messages.success(request, f'Welcome back, {user.first_name}!')
                    return redirect('/sehatsaarthi')
            else:
                # Log failed login attempts
                logger.warning(f'Failed login attempt for email: {email} from {request.META.get("REMOTE_ADDR")}')
                messages.error(request, 'Invalid credentials')
                return render(request, "login.html")
                
        except User.DoesNotExist:
            # Log failed login attempts
            logger.warning(f'Login attempt for non-existent user: {email} from {request.META.get("REMOTE_ADDR")}')
            messages.error(request, 'Invalid credentials')  # Don't reveal if user exists
            return render(request, "login.html")
    
    return render(request, "login.html")

@login_required
def logout_view(request):
    username = request.user.username
    logout(request)
    logger.info(f'User {username} logged out')
    messages.success(request, 'You have been logged out successfully!')
    return redirect('/sehatsaarthi')

@csrf_protect
def signup_view(request):
    # Redirect if user is already logged in
    if request.user.is_authenticated:
        return redirect('/sehatsaarthi')
    
    if request.method == "POST":
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')
        
        if not all([first_name, last_name, email, password1, password2]):
            messages.error(request, 'All fields are required!')
            return render(request, "signup.html")
        
        if password1 != password2:
            messages.error(request, 'Passwords do not match!')
            return render(request, "signup.html")
        
        if len(password1) < 8:
            messages.error(request, 'Password must be at least 8 characters long!')
            return render(request, "signup.html")
        
        if User.objects.filter(email=email).exists():
            messages.error(request, 'Email already registered!')
            return render(request, "signup.html")
        
        if User.objects.filter(username=email).exists():
            messages.error(request, 'Username already exists!')
            return render(request, "signup.html")
        
        try:
            # Create user (using email as username for consistency with your login)
            user = User.objects.create_user(
                username=email,  # Using email as username
                email=email,
                password=password1,
                first_name=first_name,
                last_name=last_name
            )
            
            logger.info(f'New user created: {email}')
            messages.success(request, 'Account created successfully!')
            
            # Automatically log in the user after signup
            user = authenticate(username=email, password=password1)
            if user is not None:
                login(request, user)
                return redirect('/sehatsaarthi')
            else:
                return redirect('/login')
                
        except Exception as e:
            logger.error(f'Error creating account for {email}: {str(e)}')
            messages.error(request, 'Error creating account. Please try again.')
            return render(request, "signup.html")
    
    return render(request, "signup.html")

# SECURE ADMIN DASHBOARD - Multiple layers of protection
@staff_member_required
@never_cache
def admin_dashboard_view(request):
    """
    Secure admin dashboard view.
    Only accessible by staff users (is_staff=True).
    """
    # Additional security check (optional - staff_member_required already handles this)
    if not request.user.is_staff:
        messages.error(request, 'Access denied. Insufficient permissions.')
        return redirect('/sehatsaarthi')
    
    # Log admin dashboard access
    logger.info(f'Admin {request.user.username} accessed dashboard from {request.META.get("REMOTE_ADDR")}')
    
    # You can add admin-specific context here
    context = {
        'user': request.user,
        'total_users': User.objects.count(),
        'admin_users': User.objects.filter(is_staff=True).count(),
        'regular_users': User.objects.filter(is_staff=False).count(),
    }
    
    return render(request, 'admin_dashboard.html', context)

# Alternative superuser-only view (if you need stricter access)
@login_required
def superuser_dashboard_view(request):
    """
    Even more restrictive - only for superusers
    """
    if not request.user.is_superuser:
        messages.error(request, 'Access denied. Superuser privileges required.')
        logger.warning(f'Unauthorized superuser access attempt by {request.user.username}')
        return redirect('/home')
    
    context = {
        'user': request.user,
        'all_users': User.objects.all(),
        'staff_users': User.objects.filter(is_staff=True),
    }
    
    return render(request, 'superuser_dashboard.html', context)

# Helper view for unauthorized access
def unauthorized_view(request):
    return render(request, 'unauthorized.html', status=403)


def mental_health_view(request):
    return render(request, 'mindbloom.html', {
        "STATIC_URL": settings.STATIC_URL
    })

def journal_view(request):
    return render(request, 'journal.html')

def sentiment_dashboard_view(request):
    return render(request, 'sentiment_dashboard.html')
