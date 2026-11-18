"""Bound provider I/O so an upload can fail before an origin worker disappears."""
import time
import logging
import uuid
from contextvars import ContextVar
from functools import wraps
from django.conf import settings

_deadline = ContextVar('catalog_upload_deadline', default=None)


def upload_timeout():
    budget = float(getattr(settings,'FLOW_CATALOG_UPLOAD_TIMEOUT_SECONDS',20))
    deadline = _deadline.get()
    remaining = min(budget, deadline-time.monotonic()) if deadline is not None else budget
    if remaining <= 0:
        raise OSError('Catalog upload time limit reached')
    return max(.1,remaining)


def bounded_upload(view):
    @wraps(view)
    def wrapped(*args,**kwargs):
        trace=uuid.uuid4().hex[:12]
        started=time.monotonic()
        logger=logging.getLogger('app_merchant_catalog.upload')
        logger.info('catalog_upload_started id=%s action=%s',trace,view.__name__)
        token = _deadline.set(time.monotonic()+float(getattr(settings,'FLOW_CATALOG_UPLOAD_TIMEOUT_SECONDS',20)))
        try:
            response=view(*args,**kwargs)
            response['X-BCH-Upload-ID']=trace
            logger.info('catalog_upload_finished id=%s status=%s elapsed_ms=%.1f',trace,response.status_code,(time.monotonic()-started)*1000)
            return response
        finally:
            _deadline.reset(token)
    return wrapped
