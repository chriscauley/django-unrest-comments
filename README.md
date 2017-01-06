Django Riot Comments
====================

# VERY IMPORTANT

This is a fork of django-mptt-comments that I want to turn into my own custom comment system. By the time I finish this it will not resemble django-mptt-comments in any way. I'm only doing this so that I can slowly merge my existing code into this. This repository is highly experimental and should be used by no one. That goes double for you, Tim.

The story so far
--------

I don't know how to rename apps under the new django admin system (please help!), so for now we're just going to call this app mptt_comments to avoid nasty, manual migrations on my previous apps. So far the only database changes is removing the title field.

#### Get the required third party modules

    pip install django-mptt
    pip install django-contrib-comments

#### Add the needed apps to INSTALLED_APPS

    'django_comments',
    'mptt',
    'unrest_comments',
    'django.contrib.sites', # If you aren't already using it, required for django_comments

#### Configure your root urls.py

    url(r'^comments/', include('unrest_comments.urls')),

#### Set COMMENTS_APP variable in the settings.py

    COMMENTS_APP = 'unrest_comments'

#### Add the required code to the objects detail page (see Usage)

    <comment-list data-object_pk="{{ object.pk }}" data-content_type="course.course"></comment-list>

#### Add `_comment_media.html` and `riot.js` to your base template or only on the pages with comments (either way is fine)

    <script src="https://cdn.jsdelivr.net/riot/2.5/riot+compiler.min.js"></script>
    {% include "_comment_media.html" %}

Riot will now load comments on the fly via ajax any where there is a comment-list tag with the two data-attributes. Rock on \m/

Todo
--------

- Add reddit style ranking system as well as a way to star comments (reddit gold?). This way we can accomodate thousand of comments and choose which one's to show at the top level.

- Add a flagging system - From what I could tell the flag system never actually worked in django-mptt-comments. This would be very userful.

- incorporate DRF - Still not sure if DRF is actually the right way to go. Still it could be useful so that other people can modify this to suit their needs.
