"""V2.9.9 operational wrapper: bounded one-shot monitor, no scheduler installation."""
import fcntl
import json
import os
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


def safe_file(path, *, create=False):
    """Only regular local files in existing non-symlink parent directories."""
    p = Path(path).expanduser().absolute()
    if not p.parent.is_dir() or p.parent.is_symlink() or p.is_symlink():
        raise ValueError('UNSAFE_FILE_PATH')
    if p.exists() and not p.is_file():
        raise ValueError('UNSAFE_FILE_TYPE')
    flags = os.O_RDWR | os.O_CREAT if create else os.O_RDONLY
    flags |= getattr(os, 'O_NOFOLLOW', 0)
    fd = os.open(p, flags, 0o600)
    try:
        if not __import__('stat').S_ISREG(os.fstat(fd).st_mode):
            raise ValueError('UNSAFE_FILE_TYPE')
        if os.fstat(fd).st_nlink != 1:
            raise ValueError('UNSAFE_FILE_LINK_COUNT')
        return fd
    except BaseException:
        os.close(fd)
        raise


@contextmanager
def exclusive_lock(path):
    fd = safe_file(path, create=True)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            yield False
            return
        yield True
    finally:
        os.close(fd)


def audit_event(path, event):
    """Append one sanitized operational event; no addresses, txids or credentials."""
    if path is None:
        return
    allowed = ('at_utc', 'organization_id', 'outcome', 'duration_ms', 'invoice_count',
               'change_count', 'snapshot_written', 'monitor_state', 'error_type')
    clean = {k: event[k] for k in allowed if k in event}
    raw = (json.dumps(clean, sort_keys=True, separators=(',', ':')) + '\n').encode()
    if len(raw) > 2048:
        raise ValueError('AUDIT_EVENT_TOO_LARGE')
    fd = safe_file(path, create=True)
    try:
        os.lseek(fd, 0, os.SEEK_END)
        os.write(fd, raw)
        os.fsync(fd)
    finally:
        os.close(fd)


def make_event(org_id, outcome, started, **kwargs):
    return dict(at_utc=datetime.now(timezone.utc).isoformat(), organization_id=org_id,
                outcome=outcome, duration_ms=int((time.monotonic() - started) * 1000), **kwargs)
