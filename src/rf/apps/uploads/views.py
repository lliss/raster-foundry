# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.contrib.auth.models import User

from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework import decorators
from rest_framework.permissions import AllowAny
from rest_framework.renderers import StaticHTMLRenderer

from django.conf import settings
from django.shortcuts import render_to_response

from urlparse import urlparse
from urlparse import parse_qs

import boto
import boto.auth
import boto.provider


import base64
import hmac, sha


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
@decorators.renderer_classes((StaticHTMLRenderer, ))
def sign_upload_request(request, format=None):
    to_sign = str(request.REQUEST.get('to_sign'))
    sign_me = "POSTx-amz-date:Mon, 24 Aug 2015 20:19:18 GMT/raster-foundry-test-uploads-67dc48c70b3bcf89eab78dbf5cf7900/517242_ghost2.png?uploads"
    test_sign = base64.b64encode(hmac.new(str('zt0ohBJjy90KEA/Tw39QLsv/2Wj9hKwLZi2pLLAB'), to_sign, sha).digest())
    conn = boto.connect_s3(profile_name=settings.AWS_PROFILE)
    #bucket = conn.get_bucket(settings.AWS_BUCKET_NAME, validate=False)
    bucket = conn.get_bucket('raster-foundry-test-uploads-67dc48c70b3bcf89eab78dbf5cf7900', validate=False)

    key = bucket.new_key(key_name='ghost2.png?uploads')

    #result = urlparse(key.generate_url(3600, 'POST', headers={'x-amz-date':'Mon, 24 Aug 2015 20:19:18 GMT'}, expires_in_absolute=True))
    result = urlparse(key.generate_url(3600, 'POST', headers={}, expires_in_absolute=True))
    signature = parse_qs(result.query)['Signature'][0]

    #print(
    #"POSTx-amz-date:Mon, 24 Aug 2015 20:19:18 GMT/raster-foundry-test-uploads-67dc48c70b3bcf89eab78dbf5cf7900/517242_ghost2.png?uploads"
    #expires_in, method, bucket='', key='', headers=None, query_auth=True, force_http=False, response_headers=None, expires_in_absolute=False, #version_id=None

    x = boto.auth.HmacKeys(None, None, boto.provider.Provider('aws', profile_name='rf-dev'))
    auth = x.sign_string(to_sign)


    return Response(auth)
