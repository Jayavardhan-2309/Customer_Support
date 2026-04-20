from django.http import HttpResponse, require_GET
from rest_framework.decorators import api_view

@require_GET
@api_view(['GET'])
def backend_res(_request): # using _ before request or any other parameter makes the warning of unused parameter go away, so _request is good but just that request raises warning by ide without _
    return HttpResponse('<h1>backend working</h1>')

