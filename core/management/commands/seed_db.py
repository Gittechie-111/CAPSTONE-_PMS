import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import (
    User, SupervisorProfile, ProjectProposal, AllocatedProject,
    Milestone, Submission, MeetingSlot, GradingCriteria, PanelGrade
)

class Command(BaseCommand):
    help = 'Seeds the CPMS database with rich, realistic dummy data for evaluation'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('🚀 Starting CPMS Database Seeding...'))

        # 🧹 Clear existing data safely to avoid duplicates (except superusers)
        PanelGrade.objects.all().delete()
        MeetingSlot.objects.all().delete()
        Submission.objects.all().delete()
        Milestone.objects.all().delete()
        AllocatedProject.objects.all().delete()
        ProjectProposal.objects.all().delete()
        SupervisorProfile.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        # =====================================================================
        # 👥 1. CREATE USER ACCOUNTS (Lecturers, Students, Panelists)
        # =====================================================================
        self.stdout.write('Creating user accounts...')
        
        # Lecturers
        lecturer_data = [
            ('dr_john', 'John', 'Ondieki', 'Machine Learning & Computer Vision'),
            ('prof_mary', 'Mary', 'Wanjiku', 'Cybersecurity & Blockchain'),
            ('dr_kamau', 'Evans', 'Kamau', 'Internet of Things & Embedded Systems'),
        ]
        supervisors = []
        for username, first, last, expert in lecturer_data:
            user = User.objects.create_user(
                username=username, email=f'{username}@uonbi.ac.ke',
                first_name=first, last_name=last, role='LECTURER'
            )
            user.set_password('TestPass123!')
            user.save()
            
            profile = SupervisorProfile.objects.create(user=user, expertise=expert, max_capacity=5)
            supervisors.append(profile)

        # Panelists / Examiners
        panelists = []
        for i in range(1, 4):
            user = User.objects.create_user(
                username=f'panelist_{i}', email=f'examiner{i}@uonbi.ac.ke',
                first_name=f'Examiner_{i}', last_name='Panel', role='PANELIST'
            )
            user.set_password('TestPass123!')
            user.save()
            panelists.append(user)

        # Students
        student_topics = [
            ('Smart Grid Monitoring via IoT', 'An embedded hardware framework...'),
            ('Biometric Authentication System', 'A multi-modal facial layout model...'),
            ('Decentralized Land Registry', 'A secure blockchain implementation...'),
            ('NLP Automated Legal Assistant', 'A text mining model for local laws...'),
            ('Predictive Health Diagnostics', 'Using deep learning for tumor classification...'),
        ]
        students = []
        for i, (title, desc) in enumerate(student_topics, 1):
            user = User.objects.create_user(
                username=f'student_{i}', email=f'student{i}@student.uonbi.ac.ke',
                first_name=f'Student_{i}', last_name='FinalYear', role='STUDENT'
            )
            user.set_password('TestPass123!')
            user.save()
            students.append((user, title, desc))

        # =====================================================================
        # 📂 2. SUBMIT PROPOSALS & SIMULATE AUTO-ALLOCATIONS
        # =====================================================================
        self.stdout.write('Simulating allocations...')
        allocated_projects = []
        
        for idx, (student, title, desc) in enumerate(students):
            # Pick an appointed supervisor sequentially
            assigned_sv = supervisors[idx % len(supervisors)]
            
            # Create approved proposals
            ProjectProposal.objects.create(
                title=title, description=desc, student=student,
                appointed_supervisor=assigned_sv, status='APPROVED'
            )

            # Build official project allocation blocks
            proj = AllocatedProject.objects.create(title=title, student=student, supervisor=assigned_sv)
            allocated_projects.append(proj)
            
            # Increment core capacity metrics
            assigned_sv.current_count += 1
            assigned_sv.save()

        # =====================================================================
        # 📈 3. DEADLINES & MILESTONE SUBMISSIONS
        # =====================================================================
        self.stdout.write('Building milestones and files...')
        m1 = Milestone.objects.create(title='Project Proposal Thesis', description='Upload initial layout', due_date=timezone.now() - timedelta(days=10), weight=20)
        m2 = Milestone.objects.create(title='System Prototype', description='Upload running code framework', due_date=timezone.now() + timedelta(days=20), weight=40)

        for proj in allocated_projects:
            # Simulate historical submissions for milestone 1
            Submission.objects.create(
                project=proj, milestone=m1, file_upload='project_submissions/interim_doc.pdf',
                status='APPROVED', supervisor_comments='Excellent layout. Approved to proceed.'
            )

        # =====================================================================
        # 📅 4. OPEN OFFICE HOUR SLOTS
        # =====================================================================
        self.stdout.write('Opening scheduler slots...')
        for sv in supervisors:
            MeetingSlot.objects.create(supervisor=sv, start_time=timezone.now() + timedelta(days=2, hours=10), end_time=timezone.now() + timedelta(days=2, hours=11), is_booked=False)
            MeetingSlot.objects.create(supervisor=sv, start_time=timezone.now() + timedelta(days=3, hours=14), end_time=timezone.now() + timedelta(days=3, hours=15), is_booked=False)

        # =====================================================================
        # 🎓 5. CRITERIA & PANEL PRESENTATION GRADING
        # =====================================================================
        self.stdout.write('Injecting examiner scores...')
        c1 = GradingCriteria.objects.create(name='Technical Depth & Coding', max_score=50)
        c2 = GradingCriteria.objects.create(name='Presentation Delivery', max_score=30)
        c3 = GradingCriteria.objects.create(name='Q&A Defence', max_score=20)

        # Let's seed grades for the first student project presentation
        target_project = allocated_projects[0]
        for panelist in panelists:
            PanelGrade.objects.create(project=target_project, panelist=panelist, criteria=c1, score_awarded=random.randint(40, 48))
            PanelGrade.objects.create(project=target_project, panelist=panelist, criteria=c2, score_awarded=random.randint(22, 28))
            PanelGrade.objects.create(project=target_project, panelist=panelist, criteria=c3, score_awarded=random.randint(15, 19))

        self.stdout.write(self.style.SUCCESS('🎉 Database successfully loaded with rich testing profiles! All credentials set to: TestPass123!'))
