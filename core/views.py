from django.contrib.auth import authenticate
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Card, Transaction
from django.shortcuts import render

def home(request):
    return render(request, "core/home.html")
