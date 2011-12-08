from django.conf.urls.defaults import *
from django.conf import settings
from django.conf.urls.defaults import *
from django.views.generic.simple import redirect_to

from helpers import here
# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    # (r'^project/', include('project.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/', include(admin.site.urls)),
)





urlpatterns += patterns('ywot.views',
    ### Web page:
    # Main
    url(r'^home/$', 'home', name='home'),
    
    # Accounts
    (r'^accounts/$', redirect_to, {'url': '/accounts/profile/'}),
    url(r'^accounts/profile/', 'profile', name='profile'),
    url(r'^accounts/logout/$', 'logout', name='logout'),
    (r'^accounts/private/', 'private'),
    (r'^accounts/configure/$', redirect_to, {'url': '/accounts/profile/'}),
    url(r'^accounts/configure/(.*)/$', 'configure', name='configure'),
    url(r'^accounts/configure/(beta/\w+)/$', 'configure', name='configure'),
    url(r'^accounts/member_autocomplete/$', 'member_autocomplete'),
    
    (r'^accounts/', include('registration.urls')),
    
    ### Worlds:
    # World management
    url(r'^ajax/protect/$', 'protect', name='protect'),
    url(r'^ajax/unprotect/$', 'unprotect', name='unprotect'),
    url(r'^ajax/coordlink/$', 'coordlink', name='coordlink'),
    url(r'^ajax/urllink/$', 'urllink', name='urllink'),
    

    # Worldviews
    ('^(\w*)$', 'yourworld'),
    ('^u/(\w*)$', 'yourworld'),
    ('^(beta/\w*)$', 'yourworld'),
    ('^(frontpage/\w*)$', 'yourworld'),
)

urlpatterns += patterns('',
    (r'^favicon\.ico$', redirect_to, {'url': '/static/ww.png'}),
)

if settings.DEBUG:
    urlpatterns += patterns('',
        ('^static/(?P<path>.*)$', 'django.views.static.serve',
         {'document_root': here('static')}),
    )