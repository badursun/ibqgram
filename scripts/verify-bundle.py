#!/usr/bin/env python3
"""Verify a local bundle against a separately obtained SHA-256 manifest."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('manifest', type=Path)
parser.add_argument('app', type=Path)
parser.add_argument('--bundle', choices=['telegram-native', 'webkit-shell'], default='telegram-native')
args = parser.parse_args()

try:
    manifest = json.loads(args.manifest.read_text())[args.bundle]
    root = args.app.resolve(strict=True)
    if not root.is_dir() or not isinstance(manifest, dict) or not manifest:
        raise ValueError('Empty manifest or missing application directory.')
    expected = set(manifest)
    actual = {str(file.relative_to(root)) for file in root.rglob('*') if file.is_file() or file.is_symlink()}
    if expected != actual:
        raise ValueError('Application file list differs from the manifest.')
    for name, expected_hash in manifest.items():
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Unsafe manifest path.')
        file = root / relative
        if file.is_symlink() or not file.resolve().is_relative_to(root):
            raise ValueError('Unexpected symbolic link.')
        digest = hashlib.sha256()
        with file.open('rb') as stream:
            while chunk := stream.read(1024 * 1024):
                digest.update(chunk)
        if digest.hexdigest() != expected_hash:
            raise ValueError('Application content differs from the manifest.')
except (OSError, ValueError, KeyError, TypeError) as error:
    print(f'Verification failed: {error}', file=sys.stderr)
    raise SystemExit(1)

print(f'{len(manifest)} files match SHA-256. This confirms consistency with this manifest, not publisher identity or a security audit.')
