from django.http import HttpResponse, require_GET
from django.views import api_view

@require_GET
@api_view(['GET'])
def backend_res(_request): # using _ before request or any other parameter makes the warning of unused parameter go away, so _request is good but just request raises warning by ide
    return HttpResponse('<h1>backend working</h1>')

