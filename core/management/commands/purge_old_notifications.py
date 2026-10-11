from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Notification


class Command(BaseCommand):
    help = "Deletes notifications older than 5 days."

    def handle(self, *args, **options):
        deleted, _ = Notification.objects.filter(created_at__lt=timezone.now() - timedelta(days=5)).delete()
        self.stdout.write(f"Deleted {deleted} old notification(s).")