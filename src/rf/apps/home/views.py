# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json
import boto

from django.contrib.auth.models import User
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse

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
    conn = boto.connect_s3(profile_name=settings.AWS_PROFILE)
    aws_key = conn.aws_access_key_id

    client_settings = json.dumps({
        'signerUrl': reverse('sign_request'),
        'awsKey': aws_key,
        'awsBucket': settings.AWS_BUCKET_NAME,
    })
    return client_settings
