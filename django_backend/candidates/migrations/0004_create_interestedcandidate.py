# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('candidates', '0003_alter_roleconfirmation_suggestion'),
    ]

    operations = [
        migrations.CreateModel(
            name='InterestedCandidate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('lead', 'Lead'), ('reviewed', 'Reviewed'), ('converted', 'Converted')], default='lead', max_length=20)),
                ('name', models.CharField(max_length=255)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(blank=True, max_length=30, null=True)),
                ('university', models.CharField(blank=True, max_length=255, null=True)),
                ('degree_major', models.CharField(blank=True, max_length=255, null=True)),
                ('graduation_year', models.CharField(blank=True, max_length=10, null=True)),
                ('visa_status', models.CharField(blank=True, max_length=50, null=True)),
                ('referral_source', models.CharField(blank=True, max_length=255, null=True)),
                ('referral_friend_name', models.CharField(blank=True, max_length=255, null=True)),
                ('current_location', models.CharField(blank=True, max_length=255, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('resume_url', models.URLField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='interest_leads', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'interested_candidates',
            },
        ),
    ]
