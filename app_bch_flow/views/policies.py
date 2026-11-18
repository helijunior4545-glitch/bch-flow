"""Public BCH Flow policy pages; independent of host apps and identities."""
from django.http import Http404
from django.shortcuts import render
from django.views.decorators.http import require_GET


@require_GET
def policy(request, document):
    if document not in {'privacy', 'cookies', 'terms'}:
        raise Http404
    return render(request, 'app_bch_flow/legal/policy.html', {'document': document})
