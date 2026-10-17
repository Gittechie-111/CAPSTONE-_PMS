from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Avg, F
from django.db import models, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .permissions import IsStudentRole, IsStaffRoleOrReadOnly, IsAdminRoleOrReadOnly
from .models import (
    User, AllocatedProject, ProjectProposal, Milestone,
    Submission, MeetingSlot, MeetingBooking, GradingCriteria, PanelGrade,
    SupervisorProfile, Notification, SystemSettings, ChapterDeadline)
from .serializers import (
    UserSerializer, AllocatedProjectSerializer, ProjectProposalSerializer,
    MilestoneSerializer, SubmissionSerializer, MeetingSlotSerializer,
    MeetingBookingSerializer, GradingCriteriaSerializer, PanelGradeSerializer,
    MyTokenObtainPairSerializer, SupervisorProfileSerializer, RegisterSerializer, NotificationSerializer)
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer
from .serializers import SystemSettingsSerializer
from .notifications import (
    notify, notify_slot_opened, notify_slot_rescheduled,
    notify_slot_completed, notify_slot_cancelled,
    notify_proposal_submitted, notify_proposal_decision, notify_proposal_feedback,
)
from django.db.models import Count, Q
from datetime import timedelta

CHAPTER_COUNT = 5

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {"message": "Account created successfully.", "username": user.username},
                status=201
            )
        return Response(serializer.errors, status=400)



class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.is_superuser:
            return User.objects.all().order_by('-id')
        return User.objects.filter(pk=user.pk)


class SupervisorProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SupervisorProfile.objects.all()
    serializer_class = SupervisorProfileSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        try:
            profile = request.user.supervisor_profile
        except SupervisorProfile.DoesNotExist:
            return Response({'error': 'No supervisor profile.'}, status=404)
        return Response(SupervisorProfileSerializer(profile).data)


class ProjectProposalViewSet(viewsets.ModelViewSet):
    queryset = ProjectProposal.objects.all().order_by('-created_at')
    serializer_class = ProjectProposalSerializer
    permission_classes = [IsAuthenticated] 

    def get_permissions(self):
        if self.action in ['review', 'add_feedback', 'my_proposal', 'unassigned', 'appoint']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsStudentRole()]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'LECTURER':
            return ProjectProposal.objects.filter(
                appointed_supervisor__user=user
            ).order_by('-created_at')
        elif user.role == 'STUDENT':
            return ProjectProposal.objects.filter(student=user).order_by('-created_at')
        return ProjectProposal.objects.all().order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='my-proposal')
    def my_proposal(self, request):
        """Get the current student's proposal with milestone completion status."""
        user = request.user
        if user.role != 'STUDENT':
            return Response({"error": "Only students can access this."}, status=403)
        
        # Get latest proposal (PENDING/APPROVED)
        proposal = ProjectProposal.objects.filter(
            student=user,
            status__in=['PENDING', 'APPROVED']
        ).first()
        
        if not proposal:
            return Response({"error": "No active proposal found."}, status=404)
        
        data = ProjectProposalSerializer(proposal,context={'request': request}).data
        
        # Add milestone completion status if proposal is approved
        if proposal.status == 'APPROVED':
            try:
                allocated_project = AllocatedProject.objects.get(student=user)
                milestones = Milestone.objects.all().order_by('due_date')
                milestone_status = []
                
                for milestone in milestones:
                    submission = Submission.objects.filter(
                        project=allocated_project,
                        milestone=milestone
                    ).first()
                    
                    milestone_status.append({
                        'id': milestone.id,
                        'title': milestone.title,
                        'description': milestone.description,
                        'due_date': milestone.due_date,
                        'weight': milestone.weight,
                        'status': submission.status if submission else 'PENDING',
                        'submitted_at': submission.submitted_at if submission else None
                    })
                
                data['milestone_status'] = milestone_status
            except AllocatedProject.DoesNotExist:
                data['milestone_status'] = []
        
        return Response(data)

        return Response(data)

    def perform_create(self, serializer):
        existing = ProjectProposal.objects.filter(
            student=self.request.user,
            status__in=['PENDING', 'APPROVED']
        ).exists()

        if existing:
            raise serializers.ValidationError(
                "You already have a pending or approved proposal."
            )

        settings_obj = SystemSettings.objects.filter(id=1).first()
        if settings_obj and settings_obj.proposal_deadline and timezone.now() > settings_obj.proposal_deadline:
            raise serializers.ValidationError(
                "The proposal submission deadline has passed."
            )

        research_area = serializer.validated_data.get('research_area')
   

        def with_space(qs):
            return (
                qs.annotate(load=Count('received_proposals',
                                       filter=Q(received_proposals__status__in=['PENDING', 'APPROVED'])))
                  .filter(load__lt=F('max_capacity'))
                  .order_by('load')
            )

        assigned_supervisor = with_space(SupervisorProfile.objects.filter(research_area=research_area)).first()

        # Option A: uncomment to overflow to any supervisor with space.
        # Leave commented to use Option B (unassigned proposals go to the coordinator).
        # if assigned_supervisor is None:
        #     assigned_supervisor = with_space(SupervisorProfile.objects.all()).first()

        proposal = serializer.save(student=self.request.user, appointed_supervisor=assigned_supervisor)
        notify_proposal_submitted(proposal)

    @action(detail=False, methods=['get'], url_path='unassigned')
    def unassigned(self, request):
        if not (request.user.role == 'ADMIN' or request.user.is_superuser):
            return Response({"error": "Only the coordinator can view this."}, status=403)
        qs = ProjectProposal.objects.filter(
            status='PENDING', appointed_supervisor__isnull=True
        ).order_by('created_at')
        return Response(ProjectProposalSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='appoint')
    def appoint(self, request, pk=None):
        if not (request.user.role == 'ADMIN' or request.user.is_superuser):
            return Response({"error": "Only the coordinator can appoint a supervisor."}, status=403)
        proposal = self.get_object()
        try:
            supervisor = SupervisorProfile.objects.get(pk=request.data.get('supervisor'))
        except (SupervisorProfile.DoesNotExist, ValueError, TypeError):
            return Response({"error": "Choose a valid supervisor."}, status=400)

        load = ProjectProposal.objects.filter(
            appointed_supervisor=supervisor, status__in=['PENDING', 'APPROVED']
        ).count()
        if load >= supervisor.max_capacity:
            return Response({"error": "That supervisor is already at capacity."}, status=400)

        proposal.appointed_supervisor = supervisor
        proposal.save()
        notify_proposal_submitted(proposal)
        return Response(ProjectProposalSerializer(proposal, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='review')  
    def review(self, request, pk=None):
        proposal = self.get_object()

        if request.user.role != 'LECTURER':
            return Response({"error": "Only lecturers can review proposals."}, status=403)
        if not proposal.appointed_supervisor or proposal.appointed_supervisor.user != request.user:
            return Response({"error": "You can only review proposals sent to you."}, status=403)
        if proposal.status != 'PENDING':
            return Response({"error": "This topic has already been reviewed."}, status=400)

        new_status = request.data.get('status')
        if new_status not in ['APPROVED', 'REJECTED']:
            return Response({"error": "status must be 'APPROVED' or 'REJECTED'."}, status=400)

        feedback = (request.data.get('feedback') or '').strip()
        if new_status == 'REJECTED' and not feedback and not proposal.supervisor_feedback:
            return Response({"error": "Give a reason when rejecting a topic."}, status=400)
        if feedback:
            proposal.supervisor_feedback = feedback
            proposal.feedback_updated_at = timezone.now()

        proposal.status = new_status
        proposal.save()
        notify_proposal_decision(proposal)
        return Response(ProjectProposalSerializer(proposal, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='add-feedback')
    def add_feedback(self, request, pk=None):
        """Supervisor adds feedback/suggestions to a student proposal."""
        proposal = self.get_object()

        if request.user.role != 'LECTURER':
            return Response({"error": "Only lecturers can add feedback."}, status=403)

        if not proposal.appointed_supervisor:
            return Response({
                "error": "This proposal has not been assigned to a supervisor yet. Admin may need to manually assign it."
            }, status=403)

        if proposal.appointed_supervisor.user != request.user:
            return Response({
                "error": f"This proposal is assigned to {proposal.appointed_supervisor.user.get_full_name() or proposal.appointed_supervisor.user.username}, not you."
            }, status=403)

        feedback = request.data.get('feedback', '').strip()
        if not feedback:
            return Response({"error": "Feedback cannot be empty."}, status=400)

        proposal.supervisor_feedback = feedback
        proposal.feedback_updated_at = timezone.now()
        proposal.save()
        notify_proposal_feedback(proposal)

        return Response({
            "message": "Feedback added successfully.",
            "proposal": ProjectProposalSerializer(proposal).data
        }, status=200)
    


class MilestoneViewSet(viewsets.ModelViewSet):
    queryset = Milestone.objects.all().order_by('due_date').prefetch_related('chapter_deadlines')
    serializer_class = MilestoneSerializer
    permission_classes = [IsAuthenticated, IsAdminRoleOrReadOnly]

    @action(detail=True, methods=['put'], url_path='chapter-deadlines')
    def chapter_deadlines(self, request, pk=None):
        """Coordinator sets, changes or clears chapter deadlines. Send only the chapters you want to change."""
        milestone = self.get_object()
        if not milestone.has_chapters:
            return Response({"error": "This milestone is not split into chapters."}, status=400)

        data = request.data.get('deadlines')
        if not isinstance(data, dict):
            return Response({"error": "Send deadlines as {chapter: datetime}."}, status=400)

        parsed = {}
        for key, raw in data.items():
            try:
                ch = int(key)
            except (TypeError, ValueError):
                return Response({"error": f"Invalid chapter '{key}'."}, status=400)
            if not 1 <= ch <= CHAPTER_COUNT:
                return Response({"error": f"Chapter must be between 1 and {CHAPTER_COUNT}."}, status=400)

            if raw in (None, ''):
                parsed[ch] = None            # empty clears it, so the final deadline applies
                continue
            when = parse_datetime(raw) if isinstance(raw, str) else None
            if not when:
                return Response({"error": f"Chapter {ch}: not a valid date and time."}, status=400)
            if timezone.is_naive(when):
                when = timezone.make_aware(when)
            parsed[ch] = when

        with transaction.atomic():
            for ch, when in parsed.items():
                if when is None:
                    ChapterDeadline.objects.filter(milestone=milestone, chapter=ch).delete()
                else:
                    ChapterDeadline.objects.update_or_create(
                        milestone=milestone, chapter=ch, defaults={'due_date': when}
                    )

        fresh = Milestone.objects.prefetch_related('chapter_deadlines').get(pk=milestone.pk)
        return Response(self.get_serializer(fresh).data)

class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.all().order_by('-submitted_at')
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return Submission.objects.filter(project__student=user).order_by('-submitted_at')
        elif user.role == 'LECTURER':
            return Submission.objects.filter(project__supervisor__user=user).order_by('-submitted_at')
        return Submission.objects.all().order_by('-submitted_at')

    @action(detail=True, methods=['patch'], url_path='review')
    def review(self, request, pk=None):
        submission = self.get_object()
        if request.user.role != 'LECTURER':
            return Response({"error": "Only lecturers can review submissions."}, status=403)
        if submission.project.supervisor.user != request.user:
            return Response({"error": "You can only review your own students' submissions."}, status=403)

        new_status = request.data.get('status')
        if new_status not in ['APPROVED', 'REVISIONS']:
            return Response({"error": "status must be 'APPROVED' or 'REVISIONS'."}, status=400)

        submission.status = new_status
        submission.supervisor_comments = request.data.get('comments', '')
        submission.save()
        return Response(SubmissionSerializer(submission).data)

    def create(self, request, *args, **kwargs):
        try:
            project = request.user.allocated_project
        except AllocatedProject.DoesNotExist:
            return Response({'error': 'You have no allocated supervisor yet.'}, status=400)

        try:
            milestone = Milestone.objects.get(pk=request.data.get('milestone'))
        except (Milestone.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Choose a valid milestone.'}, status=400)

        chapter = None
        if milestone.has_chapters:
            try:
                chapter = int(request.data.get('chapter'))
            except (TypeError, ValueError):
                return Response({'error': f'Choose a chapter (1-{CHAPTER_COUNT}).'}, status=400)
            if not 1 <= chapter <= CHAPTER_COUNT:
                return Response({'error': f'Chapter must be between 1 and {CHAPTER_COUNT}.'}, status=400)

        upload = request.FILES.get('file_upload')
        if not upload:
            return Response({'error': 'Attach a file.'}, status=400)

        #A submission that is still waiting for review blocks a second upload
        label = f"Chapter {chapter}" if chapter else milestone.title
        with transaction.atomic():
            # lock this student's project row so two uploads can't pass the check at the same time
            AllocatedProject.objects.select_for_update().get(pk=project.pk)

            existing = Submission.objects.filter(project=project, milestone=milestone, chapter=chapter).first()
            if existing:
                if existing.status != 'REVISIONS':
                    return Response(
                        {'error': f'{label} has already been submitted. You can upload it again only if your supervisor requests revisions.'},
                        status=400,
                    )
                existing.file_upload = upload
                existing.status = 'PENDING'
                existing.supervisor_comments = ''
                existing.submitted_at = timezone.now()
                existing.save()
                return Response(self.get_serializer(existing).data, status=200)

            submission = Submission.objects.create(
                project=project, milestone=milestone, chapter=chapter, file_upload=upload,
            )
        return Response(self.get_serializer(submission).data, status=201)

class MeetingSlotViewSet(viewsets.ModelViewSet):
    queryset = MeetingSlot.objects.all().order_by('start_time')
    serializer_class = MeetingSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            try:
                supervisor = user.allocated_project.supervisor
                return MeetingSlot.objects.filter(
                    supervisor=supervisor, status='OPEN', start_time__gt=timezone.now()
                ).order_by('start_time')
            except AllocatedProject.DoesNotExist:
                return MeetingSlot.objects.none()
        elif user.role == 'LECTURER':
            return MeetingSlot.objects.filter(supervisor__user=user).order_by('start_time')
        return MeetingSlot.objects.all().order_by('start_time')

    def perform_create(self, serializer):
        slot = serializer.save(supervisor=self.request.user.supervisor_profile)
        notify_slot_opened(slot)

    @action(detail=True, methods=['patch'], url_path='complete')
    def complete(self, request, pk=None):
        slot = self.get_object()
        if slot.supervisor.user != request.user:
            raise PermissionDenied("You can only update your own slots.")
        if not slot.is_past():
            return Response({"error": "This slot's end time hasn't passed yet."}, status=400)
        slot.status = 'COMPLETED'
        slot.save()
        notify_slot_completed(slot)
        return Response(MeetingSlotSerializer(slot).data)

    @action(detail=True, methods=['patch'], url_path='reschedule')
    def reschedule(self, request, pk=None):
        slot = self.get_object()
        if slot.supervisor.user != request.user:
            raise PermissionDenied("You can only reschedule your own slots.")

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({"error": "A reason is required to reschedule."}, status=400)

        raw_start, raw_end = request.data.get('start_time'), request.data.get('end_time')
        new_start = parse_datetime(raw_start) if raw_start else None
        new_end = parse_datetime(raw_end) if raw_end else None
        if not new_start or not new_end:
            return Response({'error': 'start_time and end_time must be valid datetimes.'}, status=400)
        if timezone.is_naive(new_start):
            new_start = timezone.make_aware(new_start)
        if timezone.is_naive(new_end):
            new_end = timezone.make_aware(new_end)
        if new_end <= new_start:
            return Response({'error': 'End time must be after start time.'}, status=400)

        slot.start_time, slot.end_time = new_start, new_end
        slot.reschedule_reason = reason
        slot.status = 'OPEN'
        slot.save()
        notify_slot_rescheduled(slot, reason)
        return Response(self.get_serializer(slot).data)

    @action(detail=True, methods=['patch'], url_path='cancel')
    def cancel(self, request, pk=None):
        slot = self.get_object()
        if slot.supervisor.user != request.user:
            raise PermissionDenied("You can only cancel your own slots.")
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({"error": "A reason is required to cancel."}, status=400)

        students = [b.student for b in slot.bookings.filter(status='BOOKED').select_related('student')]
        slot.status = 'CANCELLED'
        slot.reschedule_reason = reason
        slot.save()
        slot.bookings.filter(status='BOOKED').update(status='CANCELLED')
        notify_slot_cancelled(slot, students, reason)
        return Response(MeetingSlotSerializer(slot).data)
    
class MeetingBookingViewSet(viewsets.ModelViewSet):
    queryset = MeetingBooking.objects.all().order_by('-booked_at')
    serializer_class = MeetingBookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return MeetingBooking.objects.filter(student=user).order_by('-booked_at')
        elif user.role == 'LECTURER':
            return MeetingBooking.objects.filter(slot__supervisor__user=user).order_by('-booked_at')
        return MeetingBooking.objects.all().order_by('-booked_at')

    @transaction.atomic
    def perform_create(self, serializer):
        slot = serializer.validated_data['slot']
        student = self.request.user

        if student.role != 'STUDENT':
            raise PermissionDenied("Only students can book meeting slots.")
        try:
            if slot.supervisor_id != student.allocated_project.supervisor_id:
                raise serializers.ValidationError("That slot belongs to a different supervisor.")
        except AllocatedProject.DoesNotExist:
            raise serializers.ValidationError("You are not allocated to a supervisor yet.")
        if slot.start_time <= timezone.now():
            raise serializers.ValidationError("That slot has already started.")
        if slot.status not in ('OPEN',):
            raise serializers.ValidationError("That slot is not open for booking.")

        existing = MeetingBooking.objects.select_for_update().filter(slot=slot, student=student).first()
        if existing and existing.status == 'BOOKED':
            raise serializers.ValidationError("You have already booked a slot.")

        if slot.get_booked_count() >= slot.capacity:
            raise serializers.ValidationError("This slot is now full.")

        overlapping = MeetingBooking.objects.filter(
            student=student, status='BOOKED',
            slot__start_time__lt=slot.end_time, slot__end_time__gt=slot.start_time,
        ).exists()
        if overlapping:
            raise serializers.ValidationError("You have already booked a slot at this time.")

        if existing:
            # A cancelled booking for this slot still occupies the (slot, student) pair, so reuse it
            existing.status = 'BOOKED'
            existing.cancellation_reason = None
            existing.cancelled_at = None
            existing.save()
            serializer.instance = existing
            booking = existing
        else:
            booking = serializer.save(student=student)

        if booking.slot.get_booked_count() >= booking.slot.capacity:
            booking.slot.status = 'FULL'
            booking.slot.save()
    
    @action(detail=True, methods=['patch'], url_path='cancel')
    def cancel_booking(self, request, pk=None):
        booking = self.get_object()

        if booking.student != request.user:
            raise PermissionDenied("You can only cancel your own bookings.")
        if booking.status != 'BOOKED':
            return Response({"error": "Only active bookings can be cancelled."}, status=400)

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({"error": "A reason is required to cancel."}, status=400)

        with transaction.atomic():
            booking.status = 'CANCELLED'
            booking.cancellation_reason = reason
            booking.cancelled_at = timezone.now()
            booking.save()

            slot = booking.slot
            if slot.status == 'FULL' and slot.get_booked_count() < slot.capacity:
                slot.status = 'OPEN'
                slot.save()

        # ✅ Notify the supervisor
        Notification.objects.create(
            recipient=slot.supervisor.user,
            kind='BOOKING_CANCELLED',
            message=(
                f"{booking.student.get_full_name() or booking.student.username} "
                f"cancelled their booking for {slot.start_time:%b %d, %Y %I:%M %p}. "
                f"Reason: {reason}"
            ),
        )

        return Response(MeetingBookingSerializer(booking).data)

class GradingCriteriaViewSet(viewsets.ModelViewSet):
    queryset = GradingCriteria.objects.all()
    serializer_class = GradingCriteriaSerializer
    permission_classes = [IsAuthenticated, IsStaffRoleOrReadOnly]


class PanelGradeViewSet(viewsets.ModelViewSet):
    queryset = PanelGrade.objects.all().order_by('-graded_at')
    serializer_class = PanelGradeSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(panelist=self.request.user)


class AllocatedProjectViewSet(viewsets.ModelViewSet):
    queryset = AllocatedProject.objects.all().order_by('-assigned_at')
    serializer_class = AllocatedProjectSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsAdminRoleOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return AllocatedProject.objects.filter(student=user)
        elif user.role == 'LECTURER':
            return AllocatedProject.objects.filter(supervisor__user=user)
        return AllocatedProject.objects.all().order_by('-assigned_at')

    @action(detail=True, methods=['get'])
    def final_grade(self, request, pk=None):
        project = self.get_object()
        grades = project.grades.all()

        if not grades.exists():
            return Response({
                "project_title": project.title,
                "student": project.student.username,
                "message": "No grading records submitted yet for this project presentation."
            })

        total_grades_submitted = grades.count()
        average_score = grades.aggregate(Avg('score_awarded'))['score_awarded__avg']
        criteria_breakdown = list(grades.values('criteria__name').annotate(avg_score=Avg('score_awarded')))

        return Response({
            "project_title": project.title,
            "student": project.student.get_full_name() or project.student.username,
            "supervisor": project.supervisor.user.get_full_name() or project.supervisor.user.username,
            "total_evaluations_recorded": total_grades_submitted,
            "calculated_final_score_average": round(float(average_score), 2),
            "rubrics_breakdown_analytics": criteria_breakdown
        })

    @action(detail=False, methods=['post'], url_path='auto-allocate')
    def auto_allocate(self, request):
        if not (request.user.role == 'ADMIN' or request.user.is_superuser):
            return Response({"error": "Only the project coordinator can run allocation."}, status=403)

        allocated, skipped = [], []
        candidates = ProjectProposal.objects.filter(status='APPROVED').exclude(
            student__allocated_project__isnull=False
        ).select_related('student', 'appointed_supervisor__user')

        for proposal in candidates:
            try:
                with transaction.atomic():
                    supervisor = None
                    appointed = proposal.appointed_supervisor
                    if appointed:
                        appointed = SupervisorProfile.objects.select_for_update().get(pk=appointed.pk)
                        if appointed.current_count < appointed.max_capacity:
                            supervisor = appointed
                    if supervisor is None:
                        supervisor = (SupervisorProfile.objects.select_for_update()
                                    .filter(current_count__lt=F('max_capacity'))
                                    .order_by('current_count').first())
                    if supervisor is None:
                        skipped.append({"student": proposal.student.username,
                                        "reason": "No supervisor with available capacity."})
                        continue

                    AllocatedProject.objects.create(
                        title=proposal.title, student=proposal.student, supervisor=supervisor)
                    SupervisorProfile.objects.filter(pk=supervisor.pk).update(
                        current_count=F('current_count') + 1)
                    notify(proposal.student, 'PROJECT_ALLOCATED',
                        f"You have been allocated to {supervisor.user.get_full_name() or supervisor.user.username}. "
                        f"You can now submit work and book consultation slots.")
                    allocated.append({"student": proposal.student.username,
                                    "supervisor": supervisor.user.username,
                                    "title": proposal.title})
            except Exception as exc:
                skipped.append({"student": proposal.student.username, "reason": f"Could not allocate: {exc}"})

        return Response({
            "allocated_count": len(allocated), "skipped_count": len(skipped),
            "allocated": allocated, "skipped": skipped,
        })

class SystemSettingsViewSet(viewsets.ModelViewSet):
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    # Anyone signed in can read; only the coordinator can write (this also closes /api/settings/<id>/ to students)
    permission_classes = [IsAuthenticated, IsAdminRoleOrReadOnly]

    @action(detail=False, methods=['get', 'patch'], url_path='current')
    def current(self, request):
        settings_obj, _ = SystemSettings.objects.get_or_create(id=1)
        if request.method == 'PATCH':
            serializer = SystemSettingsSerializer(settings_obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(SystemSettingsSerializer(settings_obj).data)

    
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    VISIBLE_DAYS = 7

    def get_queryset(self):
        now = timezone.now()
        return (
            Notification.objects
            .filter(recipient=self.request.user, created_at__gte=now - timedelta(days=self.VISIBLE_DAYS))
            # a reminder for a meeting that has already started is just clutter
            .exclude(kind__in=['MEETING_REMINDER_24H', 'MEETING_REMINDER_1H'], slot__start_time__lt=now)
            .order_by('-created_at')
        )

    @action(detail=True, methods=['delete'], url_path='dismiss')
    def dismiss(self, request, pk=None):
        Notification.objects.filter(pk=pk, recipient=request.user).delete()
        return Response(status=204)

    @action(detail=False, methods=['delete'], url_path='clear')
    def clear(self, request):
        Notification.objects.filter(recipient=request.user).delete()
        return Response(status=204)
    