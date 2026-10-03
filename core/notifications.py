from django.db.models import Q
from django.utils import timezone
from .models import Notification, MeetingSlot, User

REMINDER_KINDS = ['MEETING_REMINDER_24H', 'MEETING_REMINDER_1H']


def fmt(dt):
    # localtime: shows Nairobi time, not UTC
    return timezone.localtime(dt).strftime('%a %b %d, %Y %I:%M %p')


def sup_name(supervisor):
    return supervisor.user.get_full_name() or supervisor.user.username


def supervised_students(supervisor):
    return User.objects.filter(allocated_project__supervisor=supervisor)


def notify(recipient, kind, message, slot=None):
    return Notification.objects.create(recipient=recipient, kind=kind, message=message, slot=slot)


def upcoming_slots_text(supervisor, exclude_id=None, limit=3):
    qs = MeetingSlot.objects.filter(
        supervisor=supervisor, status='OPEN', start_time__gt=timezone.now()
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    slots = list(qs.order_by('start_time')[:limit])
    if not slots:
        return "No other upcoming slots have been opened yet."
    return "Upcoming slots: " + "; ".join(fmt(s.start_time) for s in slots) + "."


def notify_slot_opened(slot):
    name = sup_name(slot.supervisor)
    notify(slot.supervisor.user, 'SLOT_OPENED',
           f"You opened a consultation slot for {fmt(slot.start_time)}. Your supervised students have been notified.", slot)
    for student in supervised_students(slot.supervisor):
        notify(student, 'SLOT_OPENED',
               f"{name} opened a consultation slot for {fmt(slot.start_time)}. Book it under Available Consultation Slots.", slot)


def notify_slot_rescheduled(slot, reason):
    name = sup_name(slot.supervisor)
    # Old reminders no longer apply to the new time
    Notification.objects.filter(slot=slot, kind__in=REMINDER_KINDS).delete()

    booked_ids = set(slot.bookings.filter(status='BOOKED').values_list('student_id', flat=True))
    notify(slot.supervisor.user, 'SLOT_RESCHEDULED',
           f"You rescheduled a slot to {fmt(slot.start_time)}. Reason: {reason}", slot)

    students = User.objects.filter(
        Q(allocated_project__supervisor=slot.supervisor) | Q(id__in=booked_ids)
    ).distinct()
    for student in students:
        subject = "Your booked meeting" if student.id in booked_ids else "A consultation slot"
        notify(student, 'SLOT_RESCHEDULED',
               f"{subject} with {name} has been rescheduled to {fmt(slot.start_time)}. Reason: {reason}", slot)


def notify_slot_completed(slot):
    name = sup_name(slot.supervisor)
    extra = upcoming_slots_text(slot.supervisor, exclude_id=slot.id)
    for booking in slot.bookings.filter(status='BOOKED').select_related('student'):
        notify(booking.student, 'SLOT_COMPLETED',
               f"Your meeting with {name} on {fmt(slot.start_time)} has passed and was marked complete. {extra}", slot)


def notify_slot_cancelled(slot, students, reason):
    name = sup_name(slot.supervisor)
    Notification.objects.filter(slot=slot, kind__in=REMINDER_KINDS).delete()
    extra = upcoming_slots_text(slot.supervisor, exclude_id=slot.id)
    for student in students:
        notify(student, 'SLOT_CANCELLED',
               f"Your meeting with {name} on {fmt(slot.start_time)} was cancelled. Reason: {reason}. {extra}", slot)