from django.contrib.sites.models import Site
from django.core.urlresolvers import reverse

from .models import UnrestComment, render_comment

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
    self.assertEqual(len(comments_list),2)
    self.assertEqual(len(children),2)

class MarkdownTestCase(ClientTestCase):
  def test_url_syntax(self):
    """
    Unrest Comments converts raw urls to links as well as using standard markdown syntax.
    We need to make sure both those work as expected.
    """
    s = """The [golden ratio][1] has long fascinated mankind because blah blah blah... And the [golden rectangle](http://en.wikipedia.org/wiki/Golden_rectangle "Wikipedia: Golden Rectangle") has aesthetic properties because of yadda yadda yadda... If you don't already know about this magical number, I'm not the person to educate you. Trust me, it's cool.

http://google.com

here is a link http://google2.com in a paragraph

[1]: http://en.wikipedia.org/wiki/Golden_rectangle

    google.com
"""
    html = render_comment(s)
    for a in [
        '<a href="http://en.wikipedia.org/wiki/Golden_rectangle">golden ratio</a>',
        '<a href="http://en.wikipedia.org/wiki/Golden_rectangle" title="Wikipedia: Golden Rectangle">golden rectangle</a>',
        '<a href="http://google.com">http://google.com</a>',
        '<a href="http://google2.com">http://google2.com</a>',
    ]:
      self.assertTrue(a in html)
    self.assertEqual(html.count("<a href"),4)
