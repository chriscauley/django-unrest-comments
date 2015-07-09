from django.conf.urls import url, patterns

urlpatterns = patterns(
  'mptt_comments.views',
  url('^(\d+)/$','detail'),
  url('^list/$','list_comments'),
  url('^post/$','post'),
  url('^edit/(\d+)/$','edit'),
  url('^delete/(\d+)/$','delete'),
  url('^flag/(\d+)/$','flag'),
)
