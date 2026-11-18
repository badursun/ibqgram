#!/usr/bin/env python3
"""Audit every bundled Mach-O component, including helpers and Swift runtimes."""
from pathlib import Path
import argparse
import json
import subprocess

MAGIC = {bytes.fromhex(value) for value in ['feedface', 'cefaedfe', 'feedfacf', 'cffaedfe', 'cafebabe', 'bebafeca', 'cafebabf', 'bfbafeca']}

def scan_bundle(bundle, required='arm64'):
    components, errors = [], []
    for path in sorted(bundle.rglob('*')):
        if not path.is_file() or path.is_symlink():
            continue
        with path.open('rb') as stream:
            if stream.read(4) not in MAGIC:
                continue
        result = subprocess.run(['lipo', '-archs', str(path)], capture_output=True, text=True)
        arches = result.stdout.strip().split() if result.returncode == 0 else []
        relative = str(path.relative_to(bundle))
        components.append({'path': relative, 'architectures': arches})
        if required not in arches:
            errors.append(relative)
    if not components:
        errors.append('No Mach-O components found')
    return {'bundle': bundle.name, 'requiredArchitecture': required, 'components': components, 'incompatible': errors}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('bundle', type=Path)
    parser.add_argument('--arch', default='arm64')
    args = parser.parse_args()
    report = scan_bundle(args.bundle, args.arch)
    print(json.dumps(report, indent=2))
    raise SystemExit(bool(report['incompatible']))
