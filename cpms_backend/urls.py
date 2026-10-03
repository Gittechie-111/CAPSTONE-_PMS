# URL configuration for cpms_backend project.
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    UserViewSet, AllocatedProjectViewSet, ProjectProposalViewSet,
    MilestoneViewSet, SubmissionViewSet, MeetingSlotViewSet, MeetingBookingViewSet,
    GradingCriteriaViewSet, PanelGradeViewSet,  SupervisorProfileViewSet, RegisterView, SystemSettingsViewSet,
    NotificationViewSet)
from core.auth_views import (LoginView, VerifyOTPView, InviteSupervisorView, ActivateAccountView,)
from rest_framework_simplejwt.views import  TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'projects', AllocatedProjectViewSet)  # 👈 This line hooks up the projects path!
router.register(r'proposals', ProjectProposalViewSet)
router.register(r'milestones', MilestoneViewSet)
router.register(r'submissions', SubmissionViewSet)
router.register(r'slots', MeetingSlotViewSet)
router.register(r'bookings', MeetingBookingViewSet)
router.register(r'criteria', GradingCriteriaViewSet)
router.register(r'grades', PanelGradeViewSet)
router.register(r'supervisors', SupervisorProfileViewSet)
router.register(r'settings', SystemSettingsViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/login/', LoginView.as_view(), name='auth_login'),
    path('api/auth/verify-otp/', VerifyOTPView.as_view(), name='auth_verify_otp'),
    path('api/auth/invite/', InviteSupervisorView.as_view(), name='auth_invite'),
    path('api/auth/activate/', ActivateAccountView.as_view(), name='auth_activate'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name='register'),
]

# ✅ FIX: serve uploaded media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('api/', include(router.urls)),  # This includes all the router URLs under /api/
#     path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
#     path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
# ]







# from django.contrib import admin
# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from core.views import (UserViewSet, AllocatedProjectViewSet, ProjectProposalViewSet,
#                          MilestoneViewSet, SubmissionViewSet, MeetingSlotViewSet, MeetingBookingViewSet,
#                          GradingCriteriaViewSet, PanelGradeViewSet )

# # Import the pre-built SimpleJWT auth views
# from rest_framework_simplejwt.views import (
#     TokenObtainPairView,
#     TokenRefreshView,
# )

# router = DefaultRouter()
# router.register(r'users', UserViewSet)
# router.register(r'projects', AllocatedProjectViewSet)
# router.register(r'proposals', ProjectProposalViewSet)

# # 🚀 Registering new milestone and scheduling endpoints
# router.register(r'milestones', MilestoneViewSet)
# router.register(r'submissions', SubmissionViewSet)
# router.register(r'slots', MeetingSlotViewSet)
# router.register(r'bookings', MeetingBookingViewSet)

# # 🚀 Registering new panel grading endpoints
# router.register(r'criteria', GradingCriteriaViewSet)
# router.register(r'grades', PanelGradeViewSet)

# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('api/', include(router.urls)),
    
#     # 🔐 Authentication Endpoints for your Frontend
#     path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # Login Endpoint
#     path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # Token Renewer
# ]






# # from django.contrib import admin
# # from django.urls import path, include
# # from rest_framework.routers import DefaultRouter
# # from core.views import UserViewSet, AllocatedProjectViewSet, ProjectProposalViewSet

# # # Automatically generate routing configurations for our viewsets
# # router = DefaultRouter()
# # router.register(r'users', UserViewSet)
# # router.register(r'projects', AllocatedProjectViewSet)
# # router.register(r'proposals', ProjectProposalViewSet)  # Registering the proposal endpoint

# # urlpatterns = [
# #     path('admin/', admin.site.urls),
# #     path('api/', include(router.urls)), # This line connects your API endpoints!
# # ]




# # from django.contrib import admin
# # from django.urls import path

# # urlpatterns = [
# #     path('admin/', admin.site.urls),
# # ]
