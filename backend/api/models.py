from django.db import models
# Create your models here.

class Sample(models.Model):
    text= models.CharField(max_length=50)
    s_id= models.CharField(max_length=20)

