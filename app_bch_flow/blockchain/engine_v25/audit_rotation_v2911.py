"""V2.9.11: rotate bounded local watch-only audit under the V299 organization lock."""
import argparse
import fcntl
import json
import os
import stat
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID


def rotate(audit_path, lock_path, max_bytes=1048576, keep=12):
    audit = Path(audit_path).expanduser().absolute()
    lock = Path(lock_path).expanduser().absolute()
    if max_bytes < 1024 or keep < 1 or keep > 1000:
        raise ValueError('INVALID_LIMITS')
    if audit.parent != lock.parent or not audit.parent.is_dir() or audit.parent.is_symlink():
        raise ValueError('UNSAFE_DIRECTORY')
    if audit.is_symlink() or lock.is_symlink():
        raise ValueError('SYMLINK_REJECTED')
    lock_fd = os.open(lock, os.O_RDWR | os.O_CREAT | getattr(os,'O_NOFOLLOW',0), 0o600)
    try:
        if not stat.S_ISREG(os.fstat(lock_fd).st_mode) or os.fstat(lock_fd).st_nlink != 1:
            raise ValueError('UNSAFE_LOCK')
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {'outcome':'SKIPPED_ALREADY_RUNNING'}
        try:
            audit_fd = os.open(audit, os.O_RDONLY | getattr(os,'O_NOFOLLOW',0))
        except FileNotFoundError:
            return {'outcome':'SKIPPED_NO_AUDIT'}
        try:
            info = os.fstat(audit_fd)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise ValueError('UNSAFE_AUDIT')
            if info.st_size < max_bytes:
                return {'outcome':'SKIPPED_BELOW_THRESHOLD','bytes':info.st_size}
            if os.stat(audit, follow_symlinks=False).st_ino != info.st_ino:
                raise ValueError('AUDIT_CHANGED')
            # A full file is rotated only when the last event is newline terminated.
            if info.st_size:
                os.lseek(audit_fd,-1,os.SEEK_END)
                if os.read(audit_fd,1) != b'\n':
                    return {'outcome':'SKIPPED_INCOMPLETE_LINE'}
        finally:
            os.close(audit_fd)
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        archive = audit.with_name(audit.name + '.' + stamp)
        if archive.exists() or archive.is_symlink():
            raise ValueError('ARCHIVE_COLLISION')
        os.rename(audit, archive)
        try:
            fd = os.open(audit, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os,'O_NOFOLLOW',0), 0o600)
            os.close(fd)
        except Exception:
            os.rename(archive,audit)
            raise
        # Archive deletion occurs only while holding the same per-organization lock.
        archives = sorted((p for p in audit.parent.glob(audit.name+'.*')
                           if p.is_file() and not p.is_symlink()
                           and len(p.name)==len(audit.name)+1+22
                           and p.name.startswith(audit.name+'.')
                           and p.name[len(audit.name)+1:].endswith('Z')),
                          key=lambda p:p.name,reverse=True)
        removed=0
        for old in archives[keep:]:
            if old.stat().st_nlink != 1:
                raise ValueError('UNSAFE_ARCHIVE')
            old.unlink()
            removed+=1
        return {'outcome':'ROTATED','bytes':info.st_size,'archive':archive.name,'removed_archives':removed}
    finally:
        os.close(lock_fd)


def main():
    parser=argparse.ArgumentParser(description='BCH Flow watch-only audit rotation')
    parser.add_argument('--org-id',required=True)
    parser.add_argument('--audit-file',required=True)
    parser.add_argument('--lock-dir',required=True)
    parser.add_argument('--max-bytes',type=int,default=1048576)
    parser.add_argument('--keep',type=int,default=12)
    args=parser.parse_args()
    org=str(UUID(args.org_id))
    lock=Path(args.lock_dir)/('bchflow-v299-'+org+'.lock')
    result=rotate(args.audit_file,lock,args.max_bytes,args.keep)
    print(json.dumps(result,sort_keys=True))

if __name__=='__main__':
    main()
