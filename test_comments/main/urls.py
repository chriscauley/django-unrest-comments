from django.urls import re_path, include
from django.contrib import admin

import main.views
import unrest_comments.urls
import lablackey.urls

from django.http import JsonResponse
def user_json(request):
  if not request.user.is_authenticated:
    return JsonResponse({})
  return JsonResponse({'user': {'id': request.user.id } })

urlpatterns = [
  re_path(r'^$',main.views.index),
  re_path(r'^user.json$',user_json),
  re_path(r'^admin/', admin.site.urls),
  re_path(r'^comments/',include(unrest_comments.urls)),
  re_path('',include(lablackey.urls)),
]
