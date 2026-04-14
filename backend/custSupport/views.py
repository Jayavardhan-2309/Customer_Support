from django.http import HttpResponse

def backend_res(_request): # using _ before request or any other parameter makes the warning of unused parameter go away, so _request is good but just request raises warning by ide
    return HttpResponse('<h1>backend working</h1>')

