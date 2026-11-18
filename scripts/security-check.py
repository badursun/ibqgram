#!/usr/bin/env python3
"""Produce bounded, local security evidence without including credentials."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import re
import stat
import subprocess

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM = 'bf4f714036f21c750d535dab199c811b3f9bfdd4'
checks = []
SOURCE_REPOS = (ROOT, ROOT / 'desktop/tdesktop', ROOT / 'desktop/tdesktop/Telegram/lib_webview')
def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()
def run(args, cwd=ROOT):
    return subprocess.run(args, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
def check(name, passed, detail):
    checks.append({'name': name, 'status': 'passed' if passed else 'failed', 'detail': detail})

env = ROOT / '.env'
secret = ''
if env.exists():
    for line in env.read_text().splitlines():
        key, sep, value = line.partition('=')
        if sep and key.strip() == 'TDESKTOP_API_HASH': secret = value.strip().strip('\"\'')
if not re.fullmatch(r'[a-fA-F0-9]{32}', secret): secret = ''
check('API configuration available for leak detection', bool(secret), 'The configured API hash is used locally for matching; its value is never included in evidence.')
check('API configuration excluded from Git', run(['git', 'check-ignore', '.env']).returncode == 0, '.env is local configuration.')
check('Private configuration file permissions', env.exists() and stat.S_IMODE(env.stat().st_mode) == 0o600, 'Only the local file owner may read or write .env.')
check('Native build directory permissions', stat.S_IMODE((ROOT / 'desktop/tdesktop/out').stat().st_mode) == 0o700 if (ROOT / 'desktop/tdesktop/out').exists() else True, 'Compiler response files and caches may contain app credentials; directory access is owner-only.')
leaks = []
for repo in SOURCE_REPOS:
    files = run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], repo).stdout.split(b'\0')
    for name in files:
        if not name or not secret: continue
        path = repo / os.fsdecode(name)
        if path.is_file() and not path.is_symlink():
            if secret.lower().encode() in path.read_bytes().lower(): leaks.append(str(path.relative_to(ROOT)))
check('App API hash absent from publishable source files', bool(secret) and not leaks, 'No values are included in this report.' if not leaks else 'Affected paths: ' + ', '.join(leaks))
html = (ROOT / 'prototype/index.html').read_text()
policies = ["connect-src 'none'", "frame-src 'none'", "worker-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "script-src 'self'"]
check('Renderer resource policy', all(policy in html for policy in policies) and 'unsafe-eval' not in html, 'Network requests, child frames, workers, plugins, form posts and dynamic script evaluation are blocked by the document policy.')
crypto_paths = ['Telegram/SourceFiles/mtproto', 'Telegram/SourceFiles/core/core_cloud_password.cpp', 'Telegram/SourceFiles/core/core_cloud_password.h']
crypto_diff = run(['git', 'diff', '--name-only', UPSTREAM, '--', *crypto_paths], ROOT / 'desktop/tdesktop')
crypto_untracked = run(['git', 'ls-files', '--others', '--exclude-standard', '--', *crypto_paths], ROOT / 'desktop/tdesktop')
check('Upstream MTProto and password primitives retained', all((ROOT / 'desktop/tdesktop' / path).exists() for path in crypto_paths) and crypto_diff.returncode == 0 and not crypto_diff.stdout.strip() and crypto_untracked.returncode == 0 and not crypto_untracked.stdout.strip(), 'Source comparison with Telegram Desktop v7.4.4, including untracked additions and existence checks. This is not an independent cryptographic audit.')
validation = run(['npm', 'test'])
check('Automated interaction and boundary tests', validation.returncode == 0, 'Current test suite executed; account login and live network behavior are outside this check.')
parity = run(['node', 'scripts/verify-ui.mjs', '--native'])
check('Shared UI resource parity', parity.returncode == 0, 'Source, Qt resource staging, Swift bundle and Telegram native bundle checked using SHA-256.')
apps = {
    'webkit-shell': ROOT / 'build/icqram.app',
    'telegram-native': ROOT / 'desktop/tdesktop/out/Debug/icqram.app',
}
for label, app in apps.items():
    architecture = run(['python3', str(ROOT / 'scripts/check-architecture.py'), str(app)])
    check(f'Apple Silicon bundle architecture: {label}', architecture.returncode == 0, 'Every bundled Mach-O component must include arm64; this does not certify future macOS API compatibility.')
    signature = run(['codesign', '--verify', '--strict', str(app)])
    check(f'Local bundle signature: {label}', signature.returncode == 0, 'Ad-hoc signature only; this does not establish a verified publisher identity or Apple notarization.')
cache = ROOT / 'desktop/tdesktop/out/CMakeCache.txt'
settings = {}
if cache.exists():
    for line in cache.read_text().splitlines():
        key, sep, value = line.partition('=')
        if sep: settings[key.split(':')[0]] = value
expected = {'TDESKTOP_API_TEST': 'OFF', 'DESKTOP_APP_DISABLE_AUTOUPDATE': 'ON', 'DESKTOP_APP_DISABLE_CRASH_REPORTS': 'ON'}
check('Native build configuration', all(settings.get(key) == value for key, value in expected.items()), 'Own API configuration, upstream automatic updates disabled and crash reporting disabled. This does not test runtime DC selection.')
report = {
    'schemaVersion': 1,
    'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'scope': 'Local development build. No claim of production readiness or independent certification.',
    'upstreamCommit': UPSTREAM,
    'rootCommit': run(['git', 'rev-parse', 'HEAD']).stdout.decode().strip(),
    'sourceDirty': bool(run(['git', 'status', '--porcelain']).stdout.strip()),
    'nativeCommit': run(['git', 'rev-parse', 'HEAD'], ROOT / 'desktop/tdesktop').stdout.decode().strip(),
    'nativeSourceDirty': bool(run(['git', 'status', '--porcelain'], ROOT / 'desktop/tdesktop').stdout.strip()),
    'buildSettings': {key: settings.get(key) for key in expected},
    'webviewCommit': run(['git', 'rev-parse', 'HEAD'], SOURCE_REPOS[2]).stdout.decode().strip(),
    'webviewSourceDirty': bool(run(['git', 'status', '--porcelain'], SOURCE_REPOS[2]).stdout.strip()),
    'checks': checks,
    'notVerified': ['Live two-way chat delivery, populated-history pagination, reconnect and locked chat windows', 'Authentication edge cases: 2FA, logout, expiry and locked sessions', 'Live profile suffix publication/removal and cross-client status sync', 'Runtime server key rejection and production/test DC isolation', 'Live network destination capture', 'Local passcode and account data at rest', 'Reproducible binary builds', 'Independent security review', 'Developer ID signing and notarization'],
}
output = ROOT / 'build/security'; output.mkdir(parents=True, exist_ok=True)
(output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
lines = ['# icqram local security evidence', '', report['scope'], '', '| Check | Result | Scope |', '| --- | --- | --- |']
lines += [f"| {item['name']} | {item['status']} | {item['detail']} |" for item in checks]
lines += ['', 'Not yet verified:', ''] + ['- ' + item for item in report['notVerified']]
(output / 'report.md').write_text('\n'.join(lines) + '\n')
manifest = {}
for label, app in apps.items():
    manifest[label] = {
        str(file.relative_to(app)): sha256(file)
        for file in sorted(app.rglob('*')) if file.is_file() and not file.is_symlink()
    }
(output / 'bundle-sha256.json').write_text(json.dumps(manifest, indent=2) + '\n')
sources = {}
for repo in SOURCE_REPOS:
    files = run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], repo).stdout.split(b'\0')
    for name in files:
        if not name: continue
        path = repo / os.fsdecode(name)
        if path.is_file() and not path.is_symlink(): sources[str(path.relative_to(ROOT))] = sha256(path)
(output / 'source-sha256.json').write_text(json.dumps(sources, indent=2, sort_keys=True) + '\n')
dependencies = run(['git', 'submodule', 'status', '--recursive'], ROOT / 'desktop/tdesktop')
(output / 'dependency-revisions.txt').write_bytes(dependencies.stdout)
failed = sum(item['status'] == 'failed' for item in checks)
print(f'{len(checks)-failed}/{len(checks)} bounded checks passed. Evidence: build/security/report.md')
raise SystemExit(1 if failed else 0)
