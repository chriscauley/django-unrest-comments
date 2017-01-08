from django.template.response import TemplateResponse

from django.contrib.auth import get_user_model

def index(request):
  values = {
    'users': get_user_model().objects.all()
  }
  return TemplateResponse(request,"index.html",values)
