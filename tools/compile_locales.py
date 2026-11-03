#!/usr/bin/env python3
"""Compile the project's singular UTF-8 gettext catalogs without system msgfmt.

The checked-in .po files remain the source of truth. Reject plural/context syntax
instead of silently miscompiling it; use GNU msgfmt if those features are added.
"""

import ast
import struct
from pathlib import Path


def compile_catalog(path):
    messages = {}
    key = value = None
    mode = None

    def finish():
        if key is not None:
            if key in messages:
                raise ValueError(f"Duplicate msgid in {path}")
            messages[key] = value or ""

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith(("msgctxt", "msgid_plural", "msgstr[")):
            raise ValueError("Plural/context catalogs require GNU msgfmt")
        if line.startswith("msgid "):
            finish()
            key = ast.literal_eval(line[6:])
            value = ""
            mode = "id"
        elif line.startswith("msgstr "):
            value = ast.literal_eval(line[7:])
            mode = "str"
        elif line.startswith('"'):
            if mode == "id":
                key += ast.literal_eval(line)
            elif mode == "str":
                value += ast.literal_eval(line)
            else:
                raise ValueError("Unexpected catalog continuation")
        else:
            raise ValueError(f"Invalid catalog syntax: {path}")
    finish()
    pairs = sorted(
        (key.encode("utf-8"), value.encode("utf-8"))
        for key, value in messages.items()
        if key == "" or value
    )
    count = len(pairs)
    offset = 28 + count * 16
    ids = b""
    values = b""
    id_table = []
    value_table = []
    for key, value in pairs:
        id_table.extend((len(key), offset + len(ids)))
        ids += key + b"\0"
    value_offset = offset + len(ids)
    for key, value in pairs:
        value_table.extend((len(value), value_offset + len(values)))
        values += value + b"\0"
    header = struct.pack("<7I", 0x950412DE, 0, count, 28, 28 + 8 * count, 0, 0)
    data = (
        header
        + struct.pack("<" + "I" * (4 * count), *(id_table + value_table))
        + ids
        + values
    )
    path.with_suffix(".mo").write_bytes(data)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    for path in sorted((root / "locale").glob("*/LC_MESSAGES/django.po")):
        compile_catalog(path)
        print(path.relative_to(root))
