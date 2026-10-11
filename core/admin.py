from django.contrib import admin
from django.contrib import messages
# Register your models here.
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, SupervisorProfile, ProjectProposal, AllocatedProject, 
    Milestone, Submission, MeetingSlot, MeetingBooking, 
    GradingCriteria, PanelGrade, SystemSettings, ThesisSubmission, PrototypeSubmission
)

@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'proposal_deadline')
    class Meta:
        verbose_name_plural = 'System settings'

        
# Customizing the layout for your User account management
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'phone_number', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets + (
        ('CPMS Role Information', {'fields': ('role', 'phone_number', 'registration_number')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('CPMS Role Information', {'fields': ('email', 'role', 'phone_number', 'registration_number')}),
    )
    actions = ['send_activation_link']

    def save_model(self, request, obj, form, change):
        # Staff accounts never get a password chosen by someone else
        if not change and obj.role in ('LECTURER', 'PANELIST'):
            obj.set_unusable_password()
            super().save_model(request, obj, form, change)
            if obj.role == 'LECTURER':
                SupervisorProfile.objects.get_or_create(user=obj, defaults={'expertise': 'OTHER'})
            self.message_user(
                request,
                f"{obj.username} was created with login disabled. Select them in the list and run "
                f"'Send activation link' so they set their own password.",
                messages.WARNING,
            )
            return
        super().save_model(request, obj, form, change)

    @admin.action(description='Send activation link (staff who have not set a password)')
    def send_activation_link(self, request, queryset):
        from .auth_views import send_activation_invite
        sent = 0
        for user in queryset.filter(role__in=['LECTURER', 'PANELIST']):
            if user.has_usable_password():
                continue
            send_activation_invite(user)
            sent += 1
        self.message_user(request, f"Activation link sent to {sent} account(s).")


@admin.register(SupervisorProfile)
class SupervisorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'research_area', 'expertise', 'max_capacity', 'current_count')
    list_filter = ('research_area',)
    search_fields = ('user__username', 'expertise')

    def has_add_permission(self, request):
        # Supervisors are appointed from the coordinator dashboard, which sends them an activation link
        return False
    
@admin.register(ProjectProposal)
class ProjectProposalAdmin(admin.ModelAdmin):
    list_display = ('title', 'student', 'appointed_supervisor', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'student__username', 'appointed_supervisor__user__username')
    readonly_fields = ('status',)   # only lecturers change this, through the app

    # # Register our new smart action item
    # actions = ['reject_proposals']

    def run_intelligent_auto_allocation(self, request, queryset):
        allocated_count = 0
        skipped_count = 0

        # Process proposals one by one (ordered by oldest first)
        for proposal in queryset.filter(status='PENDING').order_by('-created_at'):
            supervisor = proposal.appointed_supervisor

            # Safety Check: Did the student select a supervisor?
            if not supervisor:
                skipped_count += 1
                continue

            # Hard Constraint: Check if supervisor has remaining capacity
            if supervisor.current_count < supervisor.max_capacity:
                # 1. Update the proposal status
                proposal.status = 'APPROVED'
                proposal.save()

                # 2. Automatically generate the official AllocatedProject entry
                from .models import AllocatedProject
                AllocatedProject.objects.get_or_create(
                    title=proposal.title,
                    student=proposal.student,
                    supervisor=supervisor
                )

                # 3. Increment the supervisor's current student count load
                supervisor.current_count += 1
                supervisor.save()

                allocated_count += 1
            else:
                # Supervisor is full! Skip for manual coordinator override
                skipped_count += 1

        # Send a helpful pop-up alert summary to the Admin in the browser
        self.message_user(
            request, 
            f"Process Complete! Successfully allocated {allocated_count} students. "
            f"Skipped {skipped_count} proposals due to full capacity or missing supervisor choice."
        )
        
    run_intelligent_auto_allocation.short_description = "🤖 Run Intelligent Auto-Allocation"

    def reject_proposals(self, request, queryset):
        queryset.update(status='REJECTED')
    reject_proposals.short_description = "❌ Mark selected proposals as Rejected"


@admin.register(AllocatedProject)
class AllocatedProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'student', 'supervisor', 'assigned_at')
    search_fields = ('title', 'student__username', 'supervisor__user__username')

@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ('title', 'due_date', 'weight', 'has_chapters')
    list_filter = ('due_date',)

@admin.register(Submission)
class BaseSubmissionAdmin(admin.ModelAdmin):
    list_select_related = ('project__student', 'project__supervisor__user', 'milestone')
    search_fields = ('project__student__username', 'project__title')
    # date_hierarchy = 'submitted_at'
    list_per_page = 25

    @admin.display(description='Student', ordering='project__student__username')
    def student(self, obj):
        return obj.project.student.username

    @admin.display(description='Supervisor')
    def supervisor(self, obj):
        return obj.project.supervisor.user.username

    @admin.display(boolean=True, description='File')
    def has_file(self, obj):
        return bool(obj.file_upload)


@admin.register(ThesisSubmission)
class ThesisSubmissionAdmin(BaseSubmissionAdmin):
    list_display = ('student', 'supervisor', 'chapter', 'status', 'has_file', 'submitted_at')
    list_filter = ('status', 'chapter', 'project__supervisor')
    ordering = ('project__student__username', 'chapter')

    def get_queryset(self, request):
        return super().get_queryset(request).filter(milestone__has_chapters=True)


@admin.register(PrototypeSubmission)
class PrototypeSubmissionAdmin(BaseSubmissionAdmin):
    list_display = ('student', 'supervisor', 'status', 'has_file', 'submitted_at')
    list_filter = ('status', 'project__supervisor')
    ordering = ('-submitted_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(milestone__has_chapters=False)

@admin.register(MeetingSlot)
class MeetingSlotAdmin(admin.ModelAdmin):
    list_display = ('supervisor', 'start_time', 'end_time', 'capacity', 'get_booked_count', 'status')
    list_filter = ('status', 'start_time', 'supervisor')
    search_fields = ('supervisor__user__username',)
    readonly_fields = ('created_at',)

    def get_booked_count(self, obj):
        return obj.get_booked_count()
    get_booked_count.short_description = 'Booked'

@admin.register(MeetingBooking)
class MeetingBookingAdmin(admin.ModelAdmin):
    list_display = ('student', 'slot', 'status', 'booked_at')
    list_filter = ('status', 'booked_at', 'slot__supervisor')
    search_fields = ('student__username', 'slot__supervisor__user__username')
    readonly_fields = ('booked_at',)

@admin.register(GradingCriteria)
class GradingCriteriaAdmin(admin.ModelAdmin):
    list_display = ('name', 'max_score')

@admin.register(PanelGrade)
class PanelGradeAdmin(admin.ModelAdmin):
    list_display = ('project', 'panelist', 'criteria', 'score_awarded', 'graded_at')
    list_filter = ('criteria', 'graded_at')
