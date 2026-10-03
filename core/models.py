from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

# 👥 USER & PROFILE MANAGEMENT MODULE 

RESEARCH_AREA_CHOICES = [
    ('AI_ML', 'AI & Machine Learning'),
    ('CYBER', 'Cybersecurity & Blockchain'),
    ('IOT', 'IoT & Embedded Systems'),
    ('WEB', 'Web & Mobile Development'),
    ('DATA', 'Data Science & Analytics'),
    ('OTHER', 'Other'),
]

class User(AbstractUser):
    ROLE_CHOICES = [
        ('STUDENT', 'Student'),
        ('LECTURER', 'Lecturer/Supervisor'),
        ('PANELIST', 'Panelist/Examiner'),
        ('ADMIN', 'Project Coordinator'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='STUDENT')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    registration_number = models.CharField(max_length=20, blank=True, null=True, unique=True, help_text="e.g. SCT211-0001/2021")

    def __str__(self):
        return f"{self.username} ({self.role})"


class SupervisorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, limit_choices_to={'role': 'LECTURER'}, related_name='supervisor_profile')
    expertise = models.TextField(help_text="e.g., Cyber Security, NLP, IoT")
    research_area = models.CharField(max_length=10, choices=RESEARCH_AREA_CHOICES, default='OTHER')
    max_capacity = models.PositiveIntegerField(default=5)
    current_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Prof./Dr. {self.user.get_full_name() or self.user.username}"



# 📂 ALLOCATION & ALLOCATED PROJECTS MODULE 


class ProjectProposal(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    title = models.CharField(max_length=255)
    description = models.TextField()
    research_area = models.CharField(max_length=10, choices=RESEARCH_AREA_CHOICES, default='OTHER')
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'STUDENT'}, related_name='proposals')
    appointed_supervisor = models.ForeignKey(SupervisorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_proposals')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    supervisor_feedback = models.TextField(blank=True, null=True, help_text="Supervisor's feedback and improvement suggestions")
    created_at = models.DateTimeField(auto_now_add=True)
    feedback_updated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class AllocatedProject(models.Model):
    """Created automatically once a proposal is APPROVED or assigned by admin."""
    title = models.CharField(max_length=255)
    student = models.OneToOneField(User, on_delete=models.CASCADE, limit_choices_to={'role': 'STUDENT'}, related_name='allocated_project')
    supervisor = models.ForeignKey(SupervisorProfile, on_delete=models.CASCADE, related_name='supervised_projects')
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.student.username}"



# 📈 MILESTONE TRACKER & SUBMISSIONS MODULE (Weeks 7-9)


class Milestone(models.Model):
    """Set by the Project Coordinator (Admin) for all students."""
    title = models.CharField(max_length=100) # e.g., "Proposal Submission", "Prototype"
    description = models.TextField()
    due_date = models.DateTimeField()
    weight = models.PositiveIntegerField(help_text="Percentage weight toward final grade, e.g. 20")
    has_chapters = models.BooleanField(default=False, help_text="Tick for the thesis milestone: students submit Chapters 1-5 separately")

    def __str__(self):
        return self.title


class Submission(models.Model):
    """Students upload files against milestones here."""
    REVIEW_STATUS = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REVISIONS', 'Revisions Required'),
    ]
    project = models.ForeignKey(AllocatedProject, on_delete=models.CASCADE, related_name='submissions')
    milestone = models.ForeignKey(Milestone, on_delete=models.CASCADE, related_name='submissions')
    file_upload = models.FileField(upload_to='project_submissions/') 
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=15, choices=REVIEW_STATUS, default='PENDING')
    supervisor_comments = models.TextField(blank=True, null=True)
    chapter = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1-5 for chaptered milestones, empty otherwise")
    ...
    class Meta:
        unique_together = ('project', 'milestone', 'chapter')

    def __str__(self):
        return f"{self.project.student.username} - {self.milestone.title}"



# 📅 INTEGRATED MEETING SCHEDULER MODULE (Weeks 10-11)


from django.utils import timezone  # add if not already imported

class MeetingSlot(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('FULL', 'Full'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]
    supervisor = models.ForeignKey(SupervisorProfile, on_delete=models.CASCADE, related_name='slots')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=15, help_text="Max students per slot (default 15)")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    reschedule_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start_time']

    def is_past(self):
        return timezone.now() > self.end_time

    def get_booked_count(self):
        return self.bookings.filter(status='BOOKED').count()

    def get_available_seats(self):
        return max(0, self.capacity - self.get_booked_count())

    def __str__(self):
        return f"{self.supervisor.user.username} - {self.start_time.strftime('%Y-%m-%d %H:%M')} ({self.get_booked_count()}/{self.capacity})"

class MeetingBooking(models.Model):
    """Students book group meeting slots (many students per slot)."""
    STATUS_CHOICES = [
        ('BOOKED', 'Booked'),
        ('CANCELLED', 'Cancelled'),
        ('ATTENDED', 'Attended'),
    ]
    slot = models.ForeignKey(MeetingSlot, on_delete=models.CASCADE, related_name='bookings')
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'STUDENT'}, related_name='meeting_bookings')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='BOOKED')
    booked_at = models.DateTimeField(auto_now_add=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('slot', 'student')  # One student per slot only

    def __str__(self):
        return f"{self.student.username} → {self.slot.supervisor.user.username} ({self.slot.start_time.strftime('%Y-%m-%d %H:%M')})"



# 🎓 PANEL GRADING MODULE (Weeks 10-11)


class GradingCriteria(models.Model):
    """Set by Admin, e.g., 'Presentation (20 pts)', 'Technical Depth (50 pts)'"""
    name = models.CharField(max_length=100)
    max_score = models.PositiveIntegerField(default=100)

    def __str__(self):
        return self.name


class PanelGrade(models.Model):
    """Panelists log scores here. Computes averages dynamically in views later."""
    project = models.ForeignKey(AllocatedProject, on_delete=models.CASCADE, related_name='grades')
    panelist = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'PANELIST'})
    criteria = models.ForeignKey(GradingCriteria, on_delete=models.CASCADE)
    score_awarded = models.DecimalField(max_digits=5, decimal_places=2)
    graded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'panelist', 'criteria') # Prevents same panelist from scoring twice

    def __str__(self):
        return f"Grade for {self.project.student.username} by {self.panelist.username}"

class SystemSettings(models.Model):
    """Single row holding program-wide deadlines."""
    proposal_deadline = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return "System Settings"


class Notification(models.Model):
    KINDS = [
        ('BOOKING_CANCELLED', 'Booking Cancelled'),
        ('SLOT_OPENED', 'Slot Opened'),
        ('SLOT_COMPLETED', 'Slot Completed'),
        ('SLOT_RESCHEDULED', 'Slot Rescheduled'),
        ('SLOT_CANCELLED', 'Slot Cancelled'),
        ('MEETING_REMINDER_24H', 'Meeting Reminder (24h)'),
        ('MEETING_REMINDER_1H', 'Meeting Reminder (1h)'),
        ('PROJECT_ALLOCATED', 'Project Allocated'),
    ]
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    kind = models.CharField(max_length=40, choices=KINDS)
    slot = models.ForeignKey('MeetingSlot', null=True, blank=True, on_delete=models.CASCADE, related_name='notifications')
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient.username} — {self.kind}"


class LoginOTP(models.Model):
    """One-time code sent by SMS as a second login step."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_otps')
    challenge = models.CharField(max_length=32, unique=True)
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used = models.BooleanField(default=False)


class StaffInvite(models.Model):
    """Single-use activation link for supervisors appointed by the coordinator."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invites')
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)











