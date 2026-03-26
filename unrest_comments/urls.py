from django.urls import re_path

from . import views

urlpatterns = [
  re_path('^(\d+)/$', views.detail,name="comment-detail-tree"),
  re_path('^list/$', views.list_comments, name="list-comments"),
  re_path('^post/$', views.post, name="post-comment"),
  re_path('^edit/(\d+)/$', views.edit, name="edit-comment"),
  re_path('^delete/(\d+)/$', views.delete, name="delete-comment"),
  re_path('^flag/(\d+)/$', views.flag, name="flag-comment"),
]
