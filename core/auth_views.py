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
from .email_utils import send_email
from .security_questions import SECURITY_QUESTIONS, normalize_answer

OTP_ROLES = getattr(settings, 'OTP_REQUIRED_ROLES', ['LECTURER', 'PANELIST'])
OTP_TTL = timedelta(minutes=5)
OTP_MAX_ATTEMPTS = 5
INVITE_TTL = timedelta(hours=48)
SECURITY_MAX_ATTEMPTS = 5
SECURITY_LOCK = timedelta(minutes=15)


def decoy_question(username):
    """Unknown accounts get a stable fake question, so the page doesn't reveal who exists."""
    idx = int(hashlib.sha256(f"decoy:{username}".encode()).hexdigest(), 16) % len(SECURITY_QUESTIONS)
    return SECURITY_QUESTIONS[idx]


def issue_tokens(user):
    refresh = MyTokenObtainPairSerializer.get_token(user)   # carries username + role claims
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def sha256(value):
    return hashlib.sha256(value.encode()).hexdigest()


class ForgotQuestionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'reset'

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        user = User.objects.filter(username=username, is_active=True).first()
        if user and user.role != 'ADMIN' and user.security_question:
            return Response({'question': user.security_question})
        return Response({'question': decoy_question(username)})


class ForgotResetView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'reset'

    def post(self, request):
        generic = Response(
            {'detail': 'The answer is incorrect, or this account cannot be reset here.'}, status=400
        )
        username = (request.data.get('username') or '').strip()
        new_password = request.data.get('new_password') or ''
        user = User.objects.filter(username=username, is_active=True).first()

        if not user or user.role == 'ADMIN' or not user.security_answer_hash:
            return generic

        now = timezone.now()
        if user.security_locked_until and user.security_locked_until > now:
            return Response({'detail': 'Too many wrong answers. Try again in 15 minutes.'}, status=400)

        if not check_password(normalize_answer(request.data.get('answer')), user.security_answer_hash):
            user.security_failed_attempts += 1
            if user.security_failed_attempts >= SECURITY_MAX_ATTEMPTS:
                user.security_locked_until = now + SECURITY_LOCK
                user.security_failed_attempts = 0
            user.save(update_fields=['security_failed_attempts', 'security_locked_until'])
            return generic

        try:
            validate_password(new_password, user)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=400)

        user.set_password(new_password)
        user.security_failed_attempts = 0
        user.security_locked_until = None
        user.save()
        LoginOTP.objects.filter(user=user, used=False).update(used=True)
        send_email(
            user.email,
            "Your CPMS password was changed",
            "Your CPMS password was just reset using your security question. "
            "If this wasn't you, contact the project coordinator immediately.",
        )
        return Response({'message': 'Password updated. You can now sign in.'})


class SetSecurityQuestionView(APIView):
    """Signed-in users (including existing accounts) set or change their security question."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get('question')
        answer = normalize_answer(request.data.get('answer'))
        if not request.user.check_password(request.data.get('current_password') or ''):
            return Response({'detail': 'Your current password is incorrect.'}, status=400)
        if question not in SECURITY_QUESTIONS or len(answer) < 3:
            return Response({'detail': 'Choose a question and give an answer of at least 3 characters.'}, status=400)

        user = request.user
        user.security_question = question
        user.security_answer_hash = make_password(answer)
        user.security_failed_attempts = 0
        user.security_locked_until = None
        user.save(update_fields=[
            'security_question', 'security_answer_hash', 'security_failed_attempts', 'security_locked_until',
        ])
        return Response({'message': 'Security question saved.'})

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

        if user.role not in OTP_ROLES:
            return Response(issue_tokens(user))

        sms_ready = bool(user.phone_number) and settings.SMS_BACKEND != 'console'
        if not sms_ready and not user.email:
            return Response(
                {'detail': 'No usable phone number or email is registered for this account. Contact the project coordinator.'},
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

        # SMS first; email only if SMS is unavailable or fails
        channel = None
        email_text = f"Your CPMS login code is {code}. It expires in 5 minutes. Never share it with anyone."
        if sms_ready and send_sms(user.phone_number, f"CPMS login code: {code}. Valid for 5 minutes. Never share it."):
            channel = 'sms'
            if getattr(settings, 'OTP_EMAIL_ALSO', False) and user.email:
                send_email(user.email, "Your CPMS login code", email_text)
                channel = 'both'
        elif user.email:
            send_email(user.email, "Your CPMS login code", email_text)
            channel = 'email'

        if channel is None:
            return Response({'detail': 'Could not send a login code. Please try again.'}, status=503)

        return Response({
            'otp_required': True,
            'challenge_id': otp.challenge,
            'channel': channel,
            'phone_hint': ('••••' + user.phone_number[-3:]) if user.phone_number else None,
            'email_hint': user.email,
        }) 


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

def send_activation_invite(user):
    """Creates a fresh single-use link (older ones stop working) and emails it."""
    raw_token = secrets.token_urlsafe(32)
    StaffInvite.objects.filter(user=user, used=False).update(used=True)
    StaffInvite.objects.create(
        user=user, token_hash=sha256(raw_token), expires_at=timezone.now() + INVITE_TTL
    )
    link = f"{settings.FRONTEND_URL}/activate/{raw_token}"
    emailed = send_email(
        user.email,
        "Activate your CPMS supervisor account",
        f"You have been appointed as a supervisor on CPMS. "
        f"Set your own password here (link valid 48 hours, works once): {link}",
    )
    return link, emailed

class InviteSupervisorView(APIView):
    """Coordinator appoints a supervisor; the supervisor sets their own password via an emailed link."""
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

        if not username or not phone or not email:
            return Response({'error': 'Username, phone number and email are required.'}, status=400)
        if not phone.startswith('+'):
            return Response({'error': 'Use international format, e.g. +254712345678.'}, status=400)
        if area not in dict(RESEARCH_AREA_CHOICES):
            return Response({'error': 'Invalid research area.'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'That username already exists.'}, status=400)

        with transaction.atomic():
            user = User(username=username, email=email, phone_number=phone, role='LECTURER')
            user.set_unusable_password()          # cannot sign in until the invite is used
            user.save()
            SupervisorProfile.objects.create(
                user=user, expertise=expertise or area, research_area=area, max_capacity=capacity
            )

        link, emailed = send_activation_invite(user)
        body = {'message': f'Supervisor {username} appointed.', 'email_sent': emailed}
        if settings.DEBUG:
            body['activation_link'] = link        # local testing only
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
        
        question = request.data.get('security_question')
        answer = normalize_answer(request.data.get('security_answer'))
        if question not in SECURITY_QUESTIONS or len(answer) < 3:
            return Response({'detail': 'Choose a security question and give an answer (at least 3 characters).'}, status=400)
        
        try:
            validate_password(password, invite.user)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=400)

        invite.user.set_password(password)
        invite.user.security_question = question
        invite.user.security_answer_hash = make_password(answer)
        invite.user.save()
        invite.used = True
        invite.save(update_fields=['used'])
        return Response({'message': 'Account activated. You can now sign in.'})