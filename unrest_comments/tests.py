from django.contrib.sites.models import Site
from django.core.urlresolvers import reverse

from .models import UnrestComment

from lablackey.tests import ClientTestCase
import json

class PostCommentsTestCase(ClientTestCase):
  def test_create_comment(self):
    Site.objects.create(domain='testserver')
    user = self.new_user("new_user")
    self.login(user)
    user_key = "%s.%s"%(user._meta.app_label,user._meta.model_name)
    m1 = "test comment for fun and big moneys"
    m2 = "another comment"
    data = {
      'content_type': user_key,
      'comment': m1,
      'object_pk': user.pk,
    }
    self.client.post(reverse("post-comment"),data)
    data['comment'] = m2
    self.client.post(reverse("post-comment"),data)

    comments_list = self.client.get(reverse("list-comments"),{'content_type':user_key, 'object_pk': user.pk}).json()
    #comments come out in reverse order
    self.assertEqual(comments_list[1]['comment'],m1)
    self.assertEqual(comments_list[0]['comment'],m2)

    data['parent_pk'] = comments_list[0]['pk']
    r1 = 'first reply'
    r2 = 'second_reply'
    data['comment'] = r1
    self.client.post(reverse("post-comment"),data)
    data['comment'] = r2
    self.client.post(reverse("post-comment"),data)
    comments_list = self.client.get(reverse("list-comments"),{'content_type':user_key, 'object_pk': user.pk}).json()
    children = comments_list[0]['comments']

    # make sure the comments went to the appropriate parent comments
    self.assertEqual(len(comments_list),2))
    self.assertEqual(len(children),2))
