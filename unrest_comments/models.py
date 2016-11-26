import datetime

from django.db import models
from django_comments.models import Comment
from django.core import urlresolvers

from mptt.models import MPTTModel

class UnrestComment(MPTTModel, Comment):

    parent = models.ForeignKey('self', related_name='children', blank=True, null=True)

    def save(self, *a, **kw):
        if not self.ip_address:
            self.ip_address = '0.0.0.0'
        super(UnrestComment, self).save(*a, **kw)

    def get_absolute_url(self):
        tree_url = urlresolvers.reverse("comment-detail-tree", args=(self.tree_id, ))
        return "%s#c%s" % (tree_url, self.id)

    class Meta:
        ordering = ('tree_id', 'lft')
