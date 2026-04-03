from django.db import models
from django.contrib.auth.models import AbstractUser

class Organization(models.Model):

    name = models.CharField(max_length=200, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    

    def __str__(self):
        return self.name


class User(AbstractUser):

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("staff", "Staff"),
        ("user", "User"),
    ]

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default="user",
        db_index=True
    )

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True
    )

    is_available = models.BooleanField(default=True)
    active_tickets = models.IntegerField(default=0)

class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages")
    sender = models.CharField(max_length=20)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)


class SupportTicket(models.Model):

    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In_Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]

    PRIORITY_CHOICES= [
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
    ]

    CATEGORY_CHOICES = [
        ("authentication", "Authentication"),
        ("billing", "Billing"),
        ("technical", "Technical"),
        ("general", "General"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="customer_tickets")

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="tickets",
        null=True,
        blank=True
    )

    message = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="open",
        db_index=True
    )

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
        limit_choices_to={"role": "staff"}
    )

    resolution_note = models.TextField(blank=True, null=True)

    customer_feedback = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    category= models.CharField(max_length=100, choices=CATEGORY_CHOICES, default="general", db_index=True)
    priority= models.CharField(max_length=20, choices= PRIORITY_CHOICES, default="normal", db_index=True)
    description= models.TextField(blank=True)
    context= models.TextField(blank=True)


# class SupportStaff(models.Model):
#     name = models.CharField(max_length=100)
#     email = models.EmailField()
#     is_available = models.BooleanField(default=True)


class KnowledgeSource(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class UploadedPDF(models.Model):

    title = models.CharField(max_length=200)

    file = models.FileField(upload_to="pdfs/", null=True, blank=True)  # keep optional

    file_url = models.TextField(null=True, blank=True)

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="pdfs",
        null=True,
        blank=True
    )

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(max_length=20, default="queued", db_index=True)
    last_processed_page = models.IntegerField(default=0)
    total_pages = models.IntegerField(null=True, blank=True)
    is_indexed = models.BooleanField(default=False)

class TicketFeedback(models.Model):
    ticket = models.OneToOneField(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="feedback"
    )

    staff = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_feedback"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="given_feedback"
    )

    rating = models.IntegerField()  # 1–5 stars
    comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
