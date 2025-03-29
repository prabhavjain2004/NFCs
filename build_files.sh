#!/bin/bash
pip install -r requirements.txt
python manage.py collectstatic --noinput
# Migrations should be handled separately in production
# through proper deployment procedures