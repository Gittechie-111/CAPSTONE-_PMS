from django.contrib import admin

# Register your models here.
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, SupervisorProfile, ProjectProposal, AllocatedProject, 
    Milestone, Submission, MeetingSlot, MeetingBooking, 
    GradingCriteria, PanelGrade, SystemSettings
)

@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'proposal_deadline')
    
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

#Intelligent Auto-Allocation Logic
@admin.register(SupervisorProfile)
class SupervisorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'expertise', 'max_capacity', 'current_count')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'expertise')

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
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('project', 'milestone', 'chapter', 'status', 'submitted_at')
    list_filter = ('status', 'submitted_at', 'milestone')
    search_fields = ('project__title', 'project__student__username')

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
