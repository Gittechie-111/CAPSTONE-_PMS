# Generated migration for group meeting booking system

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_projectproposal_research_area_and_more'),
    ]

    operations = [
        # Add new fields to MeetingSlot
        migrations.AddField(
            model_name='meetingslot',
            name='capacity',
            field=models.PositiveIntegerField(default=15, help_text='Max students per slot (default 15)'),
        ),
        migrations.AddField(
            model_name='meetingslot',
            name='status',
            field=models.CharField(choices=[('OPEN', 'Open'), ('FULL', 'Full'), ('CANCELLED', 'Cancelled')], default='OPEN', max_length=10),
        ),
        migrations.AddField(
            model_name='meetingslot',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        # Remove old is_booked field from MeetingSlot
        migrations.RemoveField(
            model_name='meetingslot',
            name='is_booked',
        ),
        
        # Delete old MeetingBooking and recreate it with new structure
        migrations.DeleteModel(
            name='MeetingBooking',
        ),
        
        # Recreate MeetingBooking with new relationship to student instead of project
        migrations.CreateModel(
            name='MeetingBooking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('BOOKED', 'Booked'), ('CANCELLED', 'Cancelled'), ('ATTENDED', 'Attended')], default='BOOKED', max_length=10)),
                ('booked_at', models.DateTimeField(auto_now_add=True)),
                ('slot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to='core.meetingslot')),
                ('student', models.ForeignKey(limit_choices_to={'role': 'STUDENT'}, on_delete=django.db.models.deletion.CASCADE, related_name='meeting_bookings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('slot', 'student')},
            },
        ),
    ]
