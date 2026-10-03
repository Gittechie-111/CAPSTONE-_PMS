# Generated migration for supervisor feedback on proposals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_update_meeting_booking_system'),
    ]

    operations = [
        migrations.AddField(
            model_name='projectproposal',
            name='supervisor_feedback',
            field=models.TextField(blank=True, null=True, help_text="Supervisor's feedback and improvement suggestions"),
        ),
        migrations.AddField(
            model_name='projectproposal',
            name='feedback_updated_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]
