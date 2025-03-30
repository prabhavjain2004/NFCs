from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Adds the phone column to the core_user table if it does not exist'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check if the column exists
            cursor.execute("""
                SELECT COUNT(1) 
                FROM information_schema.columns 
                WHERE table_name = 'core_user' AND column_name = 'phone'
            """)
            column_exists = cursor.fetchone()[0] > 0
            
            if column_exists:
                self.stdout.write(self.style.SUCCESS('Column "phone" already exists in core_user table.'))
            else:
                # Add the column
                cursor.execute('ALTER TABLE core_user ADD COLUMN phone VARCHAR(15) NULL;')
                self.stdout.write(self.style.SUCCESS('Successfully added "phone" column to core_user table.'))
