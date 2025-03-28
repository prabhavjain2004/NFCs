apt-get update && apt-get install -y python3-pip
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput