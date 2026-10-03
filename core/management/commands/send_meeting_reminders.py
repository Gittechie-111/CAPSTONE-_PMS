from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import MeetingSlot, Notification
from core.notifications import notify, fmt, sup_name

# (kind, must start at least this far away, must start within this window)
WINDOWS = [
    ('MEETING_REMINDER_24H', timedelta(hours=1), timedelta(hours=24)),
    ('MEETING_REMINDER_1H', timedelta(0), timedelta(hours=1)),
]


class Command(BaseCommand):
    help = "Creates upcoming-meeting reminders for supervisors and booked students (safe to run repeatedly)."

    def handle(self, *args, **options):
        now = timezone.now()
        created = 0
        for kind, lower, upper in WINDOWS:
            slots = MeetingSlot.objects.filter(
                status__in=['OPEN', 'FULL'],
                start_time__gt=now + lower,
                start_time__lte=now + upper,
            ).select_related('supervisor__user')

            for slot in slots:
                mins = max(1, int((slot.start_time - now).total_seconds() // 60))
                when = f"{mins} minutes" if mins < 90 else f"{round(mins / 60)} hours"
                name = sup_name(slot.supervisor)
                booked = list(slot.bookings.filter(status='BOOKED').select_related('student'))

                targets = [(slot.supervisor.user,
                            f"Reminder: your consultation starts in about {when} ({fmt(slot.start_time)}). "
                            f"{len(booked)} student(s) booked.")]
                targets += [(b.student,
                             f"Reminder: your meeting with {name} starts in about {when} ({fmt(slot.start_time)}).")
                            for b in booked]

                for recipient, message in targets:
                    if Notification.objects.filter(recipient=recipient, slot=slot, kind=kind).exists():
                        continue
                    notify(recipient, kind, message, slot)
                    created += 1

        self.stdout.write(f"Created {created} reminder(s).")