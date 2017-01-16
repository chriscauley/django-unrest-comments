from django.conf.urls import url

from unrest_comments import views

urlpatterns = [
  url('^(\d+)/$', views.detail,name="comment-detail-tree"),
  url('^list/$', views.list_comments, name="list-comments"),
  url('^post/$', views.post, name="post-comment"),
  url('^edit/(\d+)/$', views.edit, name="edit-comment"),
  url('^delete/(\d+)/$', views.delete, name="delete-comment"),
  url('^flag/(\d+)/$', views.flag, name="flag-comment"),
]
