#!/usr/bin/env python3
"""Read-only environment report. Never prints API values or changes tools."""
import json
import os
import platform
import shutil
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent.parent
checkout = root / "desktop/tdesktop"
def command(*args):
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else None

tools = {name: bool(shutil.which(name)) for name in (
    "git", "node", "python3", "xcodebuild", "swiftc", "cmake", "ninja",
    "automake", "libtool", "wget", "pkg-config", "gtar", "nasm", "meson"
)}
status = subprocess.run(
    ["git", "-C", str(checkout), "submodule", "status", "--recursive"],
    capture_output=True, text=True,
) if checkout.exists() else None
skipped = []
pending = []
for line in status.stdout.splitlines() if status and status.returncode == 0 else []:
    if line.startswith(" "):
        continue
    module = line.split()[1]
    parent = (checkout / module).parent
    update = command("git", "config", "--file", str(parent / ".gitmodules"),
                     "--get", f"submodule.{Path(module).name}.update")
    (skipped if line.startswith("-") and update == "none" else pending).append(module)
report = {
    "project": str(root), "platform": platform.system(), "architecture": platform.machine(),
    "free_disk_gib": round(shutil.disk_usage(root).free / 2**30, 1),
    "tools_on_path": tools,
    "xcode": command("xcodebuild", "-version"),
    "upstream_commit": command("git", "-C", str(checkout), "rev-parse", "HEAD"),
    "submodules_ready": bool(status and status.returncode == 0 and status.stdout.strip()) and not pending,
    "submodules_skipped_by_upstream": skipped,
    "submodules_pending_or_mismatched": pending,
    "qt_directories": [p.name for p in (root / "desktop/Libraries/local").glob("Qt-*")],
    "api_id_in_environment": bool(os.environ.get("TDESKTOP_API_ID")),
    "api_hash_in_environment": bool(os.environ.get("TDESKTOP_API_HASH")),
    "native_preview_built": (root / "build/icqram.app/Contents/MacOS/icqramPreview").exists(),
    "telegram_xcode_project_exists": (checkout / "out/Telegram.xcodeproj").exists(),
}
print(json.dumps(report, ensure_ascii=False, indent=2))
