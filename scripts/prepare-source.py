#!/usr/bin/env python3
"""Fetch pinned public sources and apply the complete IBQgram source patches."""
import argparse
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / 'docs/upstream.json').read_text())

def run(*args, cwd=ROOT):
    return subprocess.run(args, cwd=cwd, check=True)

def output(*args, cwd):
    return subprocess.check_output(args, cwd=cwd, text=True).strip()

def checkout(repo, url, commit):
    if not repo.exists():
        repo.mkdir(parents=True)
        run('git', 'init', '--quiet', str(repo))
        run('git', 'remote', 'add', 'origin', url, cwd=repo)
        run('git', 'fetch', '--depth=1', 'origin', commit, cwd=repo)
        run('git', 'checkout', '--detach', 'FETCH_HEAD', cwd=repo)
    if output('git', 'rev-parse', 'HEAD', cwd=repo) != commit:
        raise SystemExit(f'{repo.name}: unexpected revision; use a fresh source directory. Existing files were not reset.')

def patch(repo, filename):
    path = ROOT / filename
    if subprocess.run(['git', 'apply', '--reverse', '--check', str(path)], cwd=repo, capture_output=True).returncode == 0:
        print(f'Already applied: {path.name}')
        return
    run('git', 'apply', '--check', str(path), cwd=repo)
    run('git', 'apply', str(path), cwd=repo)
    print(f'Applied: {path.name}')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--minimal', action='store_true', help='Only prepare Desktop and WebView sources for source tests; not enough for a native build.')
    args = parser.parse_args()
    native = ROOT / MANIFEST['checkout']
    checkout(native, MANIFEST['repository'], MANIFEST['commit'])
    run('git', 'submodule', 'sync', '--recursive', cwd=native)
    paths = ['Telegram/lib_webview'] if args.minimal else []
    run('git', 'submodule', 'update', '--init', '--recursive', '--jobs', '4', *paths, cwd=native)
    webview = native / 'Telegram/lib_webview'
    if output('git', 'rev-parse', 'HEAD', cwd=webview) != MANIFEST['webview']['commit']:
        raise SystemExit('Unexpected WebView revision; existing files were not reset.')
    patch(native, MANIFEST['desktopPatch'])
    patch(webview, MANIFEST['webview']['patch'])
    print('IBQgram sources ready. Dependencies and API credentials are configured separately.')

if __name__ == '__main__':
    main()
