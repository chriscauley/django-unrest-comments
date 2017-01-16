from django.conf.urls import url, include
from django.contrib import admin

import main.views, unrest_comments.urls, lablackey.urls

from django.http import JsonResponse
def user_json(request):
  if not request.user.is_authenticated():
    return JsonResponse({})
  return JsonResponse({'user': {'id': request.user.id } })

urlpatterns = [
  url(r'^$',main.views.index),
  url(r'^user.json$',user_json),
  url(r'^admin/', admin.site.urls),
  url(r'^comments/',include(unrest_comments.urls)),
  url('',include(lablackey.urls)),
]
