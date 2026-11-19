from django.db import migrations


def clean_employment_types(apps, schema_editor):
    DiscoveredJob = apps.get_model('job_discovery', 'DiscoveredJob')
    DiscoveredJob.objects.filter(
        employment_type__in=['Hyrind', 'Hybrid', 'hyrind', 'hybrid', 'remote', 'Remote']
    ).update(employment_type='Full-Time')


class Migration(migrations.Migration):

    dependencies = [
        ('job_discovery', '0008_discoveredjob_experience_max_years_and_more'),
    ]

    operations = [
        migrations.RunPython(clean_employment_types, migrations.RunPython.noop),
    ]
