from django.db import models
from django_comments.models import Comment
from django.core import urlresolvers

from mptt.models import MPTTModel

from emoji.templatetags.emoji_tags import emoji_replace
import datetime, markdown, re

def render_comment(text):
    return emoji_replace( # replace :emoji: with image tags
        markdown.markdown(text, extensions=['lablackey.mdx_urlize'], safe_mode=True) #convert markdown to html
    )

class UnrestComment(MPTTModel, Comment):
    parent = models.ForeignKey('self', related_name='children', blank=True, null=True)
    rendered = models.TextField(null=True,blank=True)

    def save(self, *a, **kw):
        self.rendered = render_comment(self.comment)
        if not self.ip_address:
            self.ip_address = '0.0.0.0'
        super(UnrestComment, self).save(*a, **kw)

    def get_absolute_url(self):
        tree_url = urlresolvers.reverse("comment-detail-tree", args=(self.tree_id, ))
        return "%s#c%s" % (tree_url, self.id)

    class Meta:
        ordering = ('tree_id', 'lft')
