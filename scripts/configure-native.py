#!/usr/bin/env python3
"""Configure the fork without sourcing .env or echoing API credentials."""
import argparse
import os
import platform
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent

def settings(environment, env_file):
    values = dict(environment)
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            key, separator, value = line.partition('=')
            key = key.strip()
            if key not in ('TDESKTOP_API_ID', 'TDESKTOP_API_HASH'):
                continue
            if not separator:
                raise ValueError('Invalid API configuration in .env')
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ('\"', "'"):
                value = value[1:-1]
            values.setdefault(key, value)
    return values

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--test-build', action='store_true', help='Compile locally with upstream test-only API configuration. Not for distribution.')
    args = parser.parse_args()
    if (ROOT / '.env').exists(): os.chmod(ROOT / '.env', 0o600)
    values = settings(os.environ, ROOT / '.env')
    if not args.test_build:
        if not re.fullmatch(r'[1-9][0-9]*', values.get('TDESKTOP_API_ID', '')) or not re.fullmatch(r'[a-fA-F0-9]{32}', values.get('TDESKTOP_API_HASH', '')):
            sys.exit('Telegram API bilgileri hazır değil. Kendi değerlerinizi .env dosyasına ekleyin; yerel derleme kontrolü için --test-build kullanılabilir.')
    qt_version = '6.11.2'
    qt = ROOT / 'desktop/Libraries/local' / ('Qt-' + qt_version)
    if not (qt / 'lib/cmake/Qt6/Qt6Config.cmake').exists():
        sys.exit('Qt hazırlığı tamamlanmadı. work/prepare-macos.log dosyasını kontrol edin.')
    subprocess.run([sys.executable, str(ROOT / 'scripts/build-icons.py')], check=True)
    subprocess.run(['node', str(ROOT / 'scripts/package-ui.mjs')], check=True)
    flags = {
        'ICQRAM_SHELL': 'ON',
        'CMAKE_OSX_ARCHITECTURES': platform.machine(),
        'ICQRAM_ICON_ICNS': str(ROOT / 'build/icqram.icns'),
        'ICQRAM_UI_QRC': str(ROOT / 'build/icqram-ui.qrc'),
        'DESKTOP_APP_DISABLE_AUTOUPDATE': 'ON',
        'DESKTOP_APP_DISABLE_CRASH_REPORTS': 'ON',
        'DESKTOP_APP_ENABLE_LTO': 'OFF',
        'TDESKTOP_API_TEST': 'ON' if args.test_build else 'OFF',
    }
    if not args.test_build:
        flags.update({key: values[key] for key in ('TDESKTOP_API_ID', 'TDESKTOP_API_HASH')})
    # The untracked preload keeps credentials out of command arguments and terminal output.
    preload = ROOT / 'work/native-config.cmake'
    preload.parent.mkdir(exist_ok=True)
    lines = []
    for key, value in flags.items():
        safe = value.replace('\\', '/').replace('"', '\\"')
        lines.append(f'set({key} "{safe}" CACHE STRING "icqram build setting" FORCE)')
    fd = os.open(preload, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as stream:
        stream.write('\n'.join(lines) + '\n')
    os.chmod(preload, 0o600)
    env = dict(os.environ)
    env['TDESKTOP_MAC_TOOLCHAIN'] = 'system'
    env.pop('TDESKTOP_API_ID', None)
    env.pop('TDESKTOP_API_HASH', None)
    if (ROOT / 'desktop/tdesktop/out/CMakeCache.txt').exists():
        env.pop('QT', None)
    else:
        env['QT'] = qt_version
    log = ROOT / 'work/configure-native.log'
    fd_log = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd_log, 'w') as output:
        result = subprocess.run(['./configure.sh', 'debug', '-C', str(preload)], cwd=ROOT / 'desktop/tdesktop/Telegram', env=env, stdout=output, stderr=subprocess.STDOUT)
    if (ROOT / 'desktop/tdesktop/out').exists(): os.chmod(ROOT / 'desktop/tdesktop/out', 0o700)
    if (ROOT / 'desktop/tdesktop/out/CMakeCache.txt').exists(): os.chmod(ROOT / 'desktop/tdesktop/out/CMakeCache.txt', 0o600)
    secret = values.get('TDESKTOP_API_HASH', '')
    if re.fullmatch(r'[a-fA-F0-9]{32}', secret):
        log.write_text(log.read_text(errors='replace').replace(secret, '[redacted-api-hash]'))
    print('Native configuration completed.' if result.returncode == 0 else 'Native configuration failed; see work/configure-native.log.')
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())
