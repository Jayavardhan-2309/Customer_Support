from django.http import HttpResponse

def backendRes(request):
    return HttpResponse('<h1>backend working</h1>')

