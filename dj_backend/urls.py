from django.contrib import admin
from django.urls import path, include
from signup.views import *
from doctors.views import *
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('',include('signup.urls')),
    path('',include('hospital.urls')),
    path('', include('doctors.urls')),
    path('', include('assessment.urls')),
    path('',include('stressmap.urls')),
    path('',include('AssessQues.urls')),
]
