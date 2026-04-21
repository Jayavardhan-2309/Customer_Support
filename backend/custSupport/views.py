from django.http import HttpResponse
from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@require_GET
@api_view(['GET'])
@permission_classes([AllowAny])
def backend_res(_request): # using _ before request or any other parameter makes the warning of unused parameter go away, so _request is good but just that request raises warning by ide without _
    return HttpResponse('<h1>backend working</h1>')

