Django Riot Comments
====================

# VERY IMPORTANT

This is a fork of django-mptt-comments that I want to turn into my own custom comment system. By the time I finish this it will not resemble django-mptt-comments in any way. I amm only doing this so that I can slowly merge my existing code into this. This repository is highly experimental and should be used by no one. That goes double for you, Tim.

#### Get the required third party modules

    pip install django-mptt
    pip install django-contrib-comments

#### Add the needed apps to INSTALLED_APPS

    'django_comments',
    'mptt',
    'unrest_comments',
    'django.contrib.sites', # If you aren't already using it, required for django_comments

#### Configure your root urls.py

Connect the comments urls to your urls.py file. You will also need to define '/user.json' somewhere, which returns a json object with the id of the logged in user. For simplicity I have shown a minimum implementation (here defined in the actual urls.py file).

    import unrest_comments.urls
    
    from django.http import JsonResponse
    def user_json(request):
      if not request.user.is_authenticated():
        return JsonResponse({})
      return JsonResponse({'user': {'id': request.user.id } })
    
    urlpatterns = [
      # ...
      url(r'^user.json$',user_json),
      url(r'^comments/', include(unrest_comments.urls)),
    ]

#### Set COMMENTS_APP variable in the settings.py

    COMMENTS_APP = 'unrest_comments'

#### Add the required code to the objects detail page (see Usage)

    <comment-list object_pk="{{ object.pk }}" content_type="course.course"></comment-list>

#### If you're not already using riot and unrest, just include `_comments_media.html` in your base template or any page that will display comments.

    {% include "_comments_media.html" %}

Otherwise, pick and choose which of the following static fies you want. `unrest_comments.js` requires riot and unrest, but the stylesheet is completely optional.

```html
{% load static %}
<script src="https://cdn.jsdelivr.net/riot/2.5/riot+compiler.min.js"></script>
<script src="{% static "unrest_comments/.dist/unrest.js" %}"></script>
<script src="{% static "unrest_comments/.dist/unrest_comments.js" %}"></script>
<link href="{% static "unrest_comments/.dist/unrest_comments.css" %}" rel="stylesheet"/>
```

Riot will now load comments on the fly via ajax any where there is a comment-list tag with the two attributes. Rock on \m/

Todo
--------

- Add reddit style ranking system as well as a way to star comments (reddit gold?). This way we can accomodate thousand of comments and choose which one's to show at the top level.

- Add a flagging system - From what I could tell the flag system never actually worked in django-mptt-comments. This would be very userful.

- incorporate DRF - Still not sure if DRF is actually the right way to go. Still it could be useful so that other people can modify this to suit their needs.
