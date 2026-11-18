#!/usr/bin/env python3
"""Check publishable Git files; never print matched secret values."""
import argparse
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--known-env', type=Path, help='Optional local credentials for exact comparisons; values are never printed.')
    args = parser.parse_args()
    secrets = {}
    if args.known_env:
        for line in args.known_env.read_text().splitlines():
            key, sep, value = line.partition('=')
            if sep and key.strip() in ('TDESKTOP_API_ID', 'TDESKTOP_API_HASH'):
                value = value.strip().strip('\"\'')
                if value:
                    secrets[key.strip()] = value.encode()
    entries = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).split(b'\0')
    issues = []; count = 0
    forbidden = re.compile(r'(^|/)(?:\.env(?:\..*)?|tdata(?:_.*)?|node_modules|work|build|out|sounds|references)(?:/|$)|\.(?:pem|key|p12|pfx|session|log)$|^desktop/(?:tdesktop|Libraries|ThirdParty)/')
    credential = re.compile(rb'(?:TDESKTOP_API_HASH|api_hash)[\s\"\x27]*[:=][\s\"\x27]*[0-9a-fA-F]{32}(?![0-9a-fA-F])')
    private_key = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')
    for raw in entries:
        if not raw:
            continue
        name = os.fsdecode(raw); file = ROOT / name; count += 1
        if name != '.env.example' and forbidden.search(name):
            issues.append((name, 'excluded local/private/generated path'))
        if file.is_symlink() or not file.is_file():
            issues.append((name, 'non-regular tracked file')); continue
        data = file.read_bytes()
        if credential.search(data) or private_key.search(data):
            issues.append((name, 'credential-shaped content'))
        for key, value in secrets.items():
            if re.search(rb'(?<![0-9A-Za-z])' + re.escape(value) + rb'(?![0-9A-Za-z])', data):
                issues.append((name, 'configured ' + key + ' matched'))
    for name, reason in issues:
        print(f'{name}: {reason}')
    print(f'Checked {count} tracked files; {len(issues)} findings. Secret values are not printed.')
    return bool(issues)

if __name__ == '__main__':
    raise SystemExit(main())
