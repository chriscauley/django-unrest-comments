from setuptools import setup, find_packages

setup(
    name = "django-unrest-comments",
    version = '0.1.0',
    url = 'https://github.com/chriscauley/django-unrest-comments/archive/v0.1.0.tar.gz',
    author = 'chriscauley',
    description = 'Threaded ajax comments using django on the back end and riot/unrest on the front.',
    keywords = ['django','comments','threaded comments'],
    packages = find_packages(),
    include_package_data=True,
)
