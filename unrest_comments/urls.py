from django.conf.urls import url, patterns

import views

urlpatterns = [
  url('^(\d+)/$', views.detail,name="comment-detail-tree"),
  url('^list/$', views.list_comments),
  url('^post/$', views.post),
  url('^edit/(\d+)/$', views.edit),
  url('^delete/(\d+)/$', views.delete),
  url('^flag/(\d+)/$', views.flag),
]
