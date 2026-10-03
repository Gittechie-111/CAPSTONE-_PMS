import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import User, LoginOTP, StaffInvite, SupervisorProfile, RESEARCH_AREA_CHOICES
from .serializers import MyTokenObtainPairSerializer
from .sms import send_sms

OTP_ROLES = getattr(settings, 'OTP_REQUIRED_ROLES', ['LECTURER', 'PANELIST'])
OTP_TTL = timedelta(minutes=5)
OTP_MAX_ATTEMPTS = 5
INVITE_TTL = timedelta(hours=48)


def issue_tokens(user):
    refresh = MyTokenObtainPairSerializer.get_token(user)   # carries username + role claims
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def sha256(value):
    return hashlib.sha256(value.encode()).hexdigest()


# NOTE: errors use 400/403, not 401 — the frontend interceptor treats 401 as "session expired".

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get('username'),
            password=request.data.get('password'),
        )
        if not user or not user.is_active:
            return Response({'detail': 'Invalid username or password.'}, status=400)

        if user.role in OTP_ROLES:
            if not user.phone_number:
                return Response(
                    {'detail': 'No phone number is registered for this account. Contact the project coordinator.'},
                    status=403,
                )
            code = f"{secrets.randbelow(10 ** 6):06d}"
            LoginOTP.objects.filter(user=user, used=False).update(used=True)   # invalidate older codes
            otp = LoginOTP.objects.create(
                user=user,
                challenge=secrets.token_urlsafe(16),
                code_hash=make_password(code),
                expires_at=timezone.now() + OTP_TTL,
            )
            send_sms(user.phone_number, f"CPMS login code: {code}. Valid for 5 minutes. Never share it.")
            return Response({
                'otp_required': True,
                'challenge_id': otp.challenge,
                'phone_hint': '••••' + user.phone_number[-3:],
            })

        return Response(issue_tokens(user))


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        otp = LoginOTP.objects.select_related('user').filter(
            challenge=request.data.get('challenge_id'), used=False
        ).first()

        if not otp or otp.expires_at < timezone.now():
            return Response({'detail': 'Code expired. Please sign in again.'}, status=400)

        if otp.attempts >= OTP_MAX_ATTEMPTS:
            otp.used = True
            otp.save(update_fields=['used'])
            return Response({'detail': 'Too many attempts. Please sign in again.'}, status=400)

        otp.attempts += 1
        otp.save(update_fields=['attempts'])

        if not check_password(str(request.data.get('code', '')).strip(), otp.code_hash):
            return Response({'detail': 'Incorrect code.'}, status=400)

        otp.used = True
        otp.save(update_fields=['used'])
        return Response(issue_tokens(otp.user))


class InviteSupervisorView(APIView):
    """Coordinator appoints a supervisor; the supervisor sets their own password via an SMS link."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.role == 'ADMIN' or request.user.is_superuser):
            return Response({'error': 'Only the project coordinator can appoint supervisors.'}, status=403)

        d = request.data
        username = (d.get('username') or '').strip()
        phone = (d.get('phone_number') or '').strip()
        email = (d.get('email') or '').strip()
        expertise = (d.get('expertise') or '').strip()
        area = d.get('research_area') or 'OTHER'

        try:
            capacity = int(d.get('max_capacity') or 5)
        except (TypeError, ValueError):
            return Response({'error': 'Capacity must be a number.'}, status=400)

        if not username or not phone:
            return Response({'error': 'Username and phone number are required.'}, status=400)
        if not phone.startswith('+'):
            return Response({'error': 'Use international format, e.g. +254712345678.'}, status=400)
        if area not in dict(RESEARCH_AREA_CHOICES):
            return Response({'error': 'Invalid research area.'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'That username already exists.'}, status=400)

        raw_token = secrets.token_urlsafe(32)
        with transaction.atomic():
            user = User(username=username, email=email, phone_number=phone, role='LECTURER')
            user.set_unusable_password()          # cannot log in until the invite is used
            user.save()
            SupervisorProfile.objects.create(
                user=user, expertise=expertise or area, research_area=area, max_capacity=capacity
            )
            StaffInvite.objects.create(
                user=user, token_hash=sha256(raw_token), expires_at=timezone.now() + INVITE_TTL
            )

        link = f"{settings.FRONTEND_URL}/activate/{raw_token}"
        sent = send_sms(
            phone,
            f"You have been appointed as a supervisor on CPMS. Set up your account (valid 48h): {link}",
        )
        body = {'message': f'Supervisor {username} appointed.', 'sms_sent': sent}
        if settings.DEBUG:
            body['activation_link'] = link        # convenient for local testing only
        return Response(body, status=201)


class ActivateAccountView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        raw = request.data.get('token') or ''
        password = request.data.get('password') or ''
        invite = StaffInvite.objects.select_related('user').filter(token_hash=sha256(raw), used=False).first()

        if not invite or invite.expires_at < timezone.now():
            return Response({'detail': 'This link is invalid or has expired. Ask the coordinator for a new one.'}, status=400)

        try:
            validate_password(password, invite.user)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=400)

        invite.user.set_password(password)
        invite.user.save()
        invite.used = True
        invite.save(update_fields=['used'])
        return Response({'message': 'Account activated. You can now sign in.'})