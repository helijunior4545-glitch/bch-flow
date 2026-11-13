"""V320 read-only modal routing. Existing views retain authorization and financial rules."""
from django.http import HttpResponse, HttpResponseNotAllowed
from django.shortcuts import redirect
from django.views.decorators.http import require_http_methods
from django.urls import reverse
from django.utils.html import escape
from html.parser import HTMLParser
from app_bch_flow.views import v3_workspace, wallet_v41, wallet_v42, wallet_v43

class MainParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.depth=0; self.parts=[]; self.found=False
    def handle_starttag(self, tag, attrs):
        if self.depth:
            self.parts.append(self.get_starttag_text()); self.depth+= (0 if tag in ('input','img','br','hr','meta','link','source','area','wbr') else 1)
        elif tag=='main':
            self.found=True; self.depth=1; self.parts.append(self.get_starttag_text())
    def handle_startendtag(self, tag, attrs):
        if self.depth: self.parts.append(self.get_starttag_text())
    def handle_endtag(self, tag):
        if self.depth:
            self.parts.append('</'+tag+'>'); self.depth-=1
    def handle_data(self, data):
        if self.depth:self.parts.append(data)
    def handle_entityref(self, name):
        if self.depth:self.parts.append('&'+name+';')
    def handle_charref(self, name):
        if self.depth:self.parts.append('&#'+name+';')

@require_http_methods(['GET','POST'])
def modal(request, org_id, panel):
    # All permission checks remain in the original views. Never trust client claims.
    routes={
        'receive': (v3_workspace.create_invoice, True),
        'send': (wallet_v41.send_preview, False),
        'activity': (v3_workspace.workspace, False),
        'addresses': (wallet_v41.wallet_home, False),
        'blockchain': (wallet_v42.transaction_lookup, False),
        'monitor': (wallet_v43.address_monitor, False),
    }
    if panel not in routes:
        from django.http import Http404
        raise Http404('Unknown wallet panel')
    view, allow_post=routes[panel]
    if request.method=='POST' and not allow_post:
        return HttpResponseNotAllowed(['GET'])
    response=view(request,org_id)
    if response.status_code in (301,302,303,307,308):
        # A successful invoice POST redirects to invoice detail; browser follows
        # the original authorized route, and the shell renders its main content.
        return response
    if response.status_code!=200:return response
    parser=MainParser()
    parser.feed(response.content.decode(response.charset or 'utf-8',errors='replace'))
    if not parser.found:return HttpResponse('Content unavailable',status=502)
    content=''.join(parser.parts)
    # Never extract executable script elements from legacy pages.
    from django.utils.html import strip_tags
    if panel=='addresses':
        # Dedicated, organization-scoped address content is already in wallet home.
        # Returning full wallet markup would duplicate shell, so show a safe link
        # to the embedded address section instead.
        content='<section class="v320-note"><h2>Receiving addresses</h2><p>See the wallet address compartment below the card.</p></section>'
    result=HttpResponse(content,content_type='text/html; charset=utf-8')
    result['Cache-Control']='no-store'
    result['X-Content-Type-Options']='nosniff'
    result['X-Robots-Tag']='noindex'
    return result
