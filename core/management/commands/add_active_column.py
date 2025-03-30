from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Adds the active column to the core_outlet table if it does not exist'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check if the column exists
            cursor.execute("""
                SELECT COUNT(1) 
                FROM information_schema.columns 
                WHERE table_name = 'core_outlet' AND column_name = 'active'
            """)
            column_exists = cursor.fetchone()[0] > 0
            
            if column_exists:
                self.stdout.write(self.style.SUCCESS('Column "active" already exists in core_outlet table.'))
            else:
                # Add the column
                cursor.execute('ALTER TABLE core_outlet ADD COLUMN active BOOLEAN DEFAULT TRUE;')
                self.stdout.write(self.style.SUCCESS('Successfully added "active" column to core_outlet table.'))
