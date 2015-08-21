# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json

from django.contrib.auth.models import User
from django.shortcuts import render_to_response
from rest_framework import serializers, viewsets

from django.conf import settings


# Serializers define the API representation.
class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ('url', 'username', 'email', 'is_staff')


# ViewSets define the view behavior.
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


def home_page(request):
    return render_to_response('home/home.html',
                              {'client_settings': get_client_settings()})


def get_client_settings():
    client_settings = json.dumps({
        'signerUrl': settings.CLIENT_SETTINGS['signer_url'],
        'awsKey': settings.CLIENT_SETTINGS['aws_key'],
        'awsBucket': settings.CLIENT_SETTINGS['aws_bucket'],
    })
    return client_settings
