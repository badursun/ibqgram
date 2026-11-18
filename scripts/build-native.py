#!/usr/bin/env python3
"""Run the native Debug build with private, redacted local logs."""
from pathlib import Path
import importlib.util
import os
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
subprocess.run([sys.executable, str(ROOT / 'scripts/build-icons.py')], cwd=ROOT, check=True)
subprocess.run(['node', str(ROOT / 'scripts/package-ui.mjs')], cwd=ROOT, check=True)
spec = importlib.util.spec_from_file_location('configure_native', ROOT / 'scripts/configure-native.py')
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)
values = config.settings(os.environ, ROOT / '.env')
secret = values.get('TDESKTOP_API_HASH', '')
if not re.fullmatch(r'[a-fA-F0-9]{32}', secret): secret = ''
work = ROOT / 'work'; work.mkdir(exist_ok=True); os.chmod(work, 0o700)
out = ROOT / 'desktop/tdesktop/out'
if out.exists(): os.chmod(out, 0o700)
fd = os.open(work / 'native-build.log', os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
print('icqram native Debug build started. Progress: work/native-build.log', flush=True)
process = subprocess.Popen(['cmake', '--build', str(out), '--config', 'Debug', '--target', 'Telegram', '--parallel', '8'], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors='replace')
with os.fdopen(fd, 'w') as log:
    for line in process.stdout:
        log.write(line.replace(secret, '[redacted-api-hash]') if secret else line)
        log.flush()
result = process.wait()
print('Native build succeeded.' if result == 0 else 'Native build failed; inspect the private log for details.')
sys.exit(result)
