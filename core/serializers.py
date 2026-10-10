from rest_framework import serializers
from .models import User, AllocatedProject, SupervisorProfile, ProjectProposal
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import SystemSettings, Notification
from .models import Milestone, Submission, MeetingSlot, MeetingBooking

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.role  # ⚠️ only works if your User model has a `role` field
        return token
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone_number', 'registration_number']


class SupervisorProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = SupervisorProfile
        fields = ['id', 'user_details', 'expertise', 'research_area', 'max_capacity', 'current_count']

class AllocatedProjectSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    supervisor_details = SupervisorProfileSerializer(source='supervisor', read_only=True)

    class Meta:
        model = AllocatedProject
        fields = ['id', 'title', 'student_details', 'supervisor_details', 'assigned_at']



class ProjectProposalSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    appointed_supervisor_details = SupervisorProfileSerializer(source='appointed_supervisor', read_only=True)

    class Meta:
        model = ProjectProposal
        fields = [
            'id', 'title', 'description', 'research_area', 'student',
            'appointed_supervisor', 'appointed_supervisor_details',
            'status', 'student_details', 'supervisor_feedback', 
            'created_at', 'feedback_updated_at'
        ]
        read_only_fields = ['student', 'status', 'appointed_supervisor', 'feedback_updated_at']
        def to_representation(self, instance):
            data = super().to_representation(instance)
            request = self.context.get('request')
            user = getattr(request, 'user', None)
            if user and getattr(user, 'role', None) == 'STUDENT':
                if not AllocatedProject.objects.filter(student=instance.student).exists():
                    data['appointed_supervisor'] = None
                    data['appointed_supervisor_details'] = None
            return data



# 📈 MILESTONE & SUBMISSION SERIALIZERS

class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ['id', 'title', 'description', 'due_date', 'weight', 'has_chapters']



class SubmissionSerializer(serializers.ModelSerializer):
    file_upload = serializers.SerializerMethodField()
    project_details = AllocatedProjectSerializer(source='project', read_only=True)
    milestone_details = MilestoneSerializer(source='milestone', read_only=True)

    class Meta:
        model = Submission
        fields = [
            'id', 'project', 'milestone', 'file_upload', 'submitted_at', 
            'status', 'supervisor_comments', 'project_details', 'milestone_details', 'chapter'
        ]
        read_only_fields = ['project', 'status', 'supervisor_comments', 'chapter']

    def get_file_upload(self, obj):
        request = self.context.get('request')
        if obj.file_upload and request:
            return request.build_absolute_uri(obj.file_upload.url)
        return None


# 📅 MEETING SCHEDULER SERIALIZERS (Group-based booking)


class MeetingSlotSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.user.get_full_name', read_only=True)
    booked_count = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    is_past = serializers.SerializerMethodField()

    class Meta:
        model = MeetingSlot
        fields = [
            'id', 'supervisor', 'supervisor_name', 'start_time', 'end_time',
            'capacity', 'booked_count', 'available_seats', 'status',
            'reschedule_reason', 'is_past', 'created_at'
        ]
        read_only_fields = ['supervisor', 'status', 'created_at', 'reschedule_reason']

    def get_booked_count(self, obj):
        return obj.get_booked_count()

    def get_available_seats(self, obj):
        return obj.get_available_seats()

    def get_is_past(self, obj):
        return obj.is_past()


class MeetingBookingSerializer(serializers.ModelSerializer):
    slot_details = MeetingSlotSerializer(source='slot', read_only=True)
    student_details = UserSerializer(source='student', read_only=True)

    class Meta:
        model = MeetingBooking
        fields = [
            'id', 'slot', 'student', 'status', 'booked_at', 
            'slot_details', 'student_details'
        ]
        read_only_fields = ['student', 'status', 'booked_at']

from .models import GradingCriteria, PanelGrade


# 🎓 REGISTRATION SERIALIZERS

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    registration_number = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'phone_number', 'registration_number']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            phone_number=validated_data.get('phone_number', ''),
            registration_number=validated_data.get('registration_number'),
            password=validated_data['password'],
            role='STUDENT'
        )
        return user





# 🎓 PANEL GRADING SERIALIZERS


class GradingCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingCriteria
        fields = ['id', 'name', 'max_score']


class PanelGradeSerializer(serializers.ModelSerializer):
    panelist_name = serializers.CharField(source='panelist.get_full_name', read_only=True)
    criteria_name = serializers.CharField(source='criteria.name', read_only=True)

    class Meta:
        model = PanelGrade
        fields = ['id', 'project', 'panelist', 'panelist_name', 'criteria', 'criteria_name', 'score_awarded', 'graded_at']
        read_only_fields = ['panelist'] # Tied automatically to the logged-in user session

    def validate(self, data):
        # Business Constraint Validation: Prevent scoring higher than the maximum allowed points
        criteria = data['criteria']
        if data['score_awarded'] > criteria.max_score:
            raise serializers.ValidationError(
                {"score_awarded": f"Score cannot exceed the maximum limit of {criteria.max_score} points for {criteria.name}."}
            )
        return data

class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = ['id', 'proposal_deadline']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'kind', 'created_at', 'read']