"""
extract_xeno_dll.py
Extracts Xeno.dll from the Xeno Electron NSIS installer and replaces
the one in infernix-executor/bin/
"""

import subprocess
import shutil
import os
import sys
import tempfile
import glob

SEVEN_ZIP = r"C:\Program Files\7-Zip\7z.exe"
XENO_EXE  = r"D:\Xeno x Infernix\Xeno-v1.3.50.exe"
BIN_DIR   = r"D:\Xeno x Infernix\infernix-executor\bin"
TARGET    = os.path.join(BIN_DIR, "Xeno.dll")


def run_7z(args, cwd=None):
    cmd = [SEVEN_ZIP] + args
    print(f"  Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if result.returncode not in (0, 1):  # 7z returns 1 for warnings
        print(f"  STDERR: {result.stderr[:500]}")
        raise RuntimeError(f"7z exited with code {result.returncode}")
    return result.stdout


def find_files(root, name_pattern):
    """Recursively find files matching name_pattern under root."""
    matches = []
    for dirpath, dirnames, filenames in os.walk(root):
        for f in filenames:
            if f.lower() == name_pattern.lower():
                matches.append(os.path.join(dirpath, f))
    return matches


def main():
    # ── Stage 1: extract the NSIS .exe ──────────────────────────
    stage1 = tempfile.mkdtemp(prefix="xeno_stage1_")
    print(f"[1/3] Extracting NSIS installer to: {stage1}")
    run_7z(["x", XENO_EXE, f"-o{stage1}", "-y"])

    # List what we got
    top = os.listdir(stage1)
    print(f"      Top-level items: {top}")

    # ── Stage 2: look for inner 7z / nsis packages ──────────────
    # electron-builder packs everything into app-64.7z or app.7z
    inner_archives = glob.glob(os.path.join(stage1, "**", "app-64.7z"), recursive=True) + \
                     glob.glob(os.path.join(stage1, "**", "app.7z"),    recursive=True) + \
                     glob.glob(os.path.join(stage1, "**", "*.7z"),      recursive=True)

    stage2 = tempfile.mkdtemp(prefix="xeno_stage2_")

    if inner_archives:
        # use the largest one – that's the real app
        inner_archives.sort(key=lambda p: os.path.getsize(p), reverse=True)
        best = inner_archives[0]
        print(f"[2/3] Extracting inner archive: {best}")
        print(f"      -> {stage2}")
        run_7z(["x", best, f"-o{stage2}", "-y"])
        search_root = stage2
    else:
        print("[2/3] No inner 7z found – searching stage1 directly")
        search_root = stage1

    # List stage2 top items
    print(f"      Search root contents: {os.listdir(search_root)[:20]}")

    # ── Stage 3: find Xeno.dll ───────────────────────────────────
    print(f"[3/3] Searching for Xeno.dll in {search_root} ...")
    matches = find_files(search_root, "Xeno.dll")

    if not matches:
        # Also try stage1 in case it was there
        matches = find_files(stage1, "Xeno.dll")

    if not matches:
        print("\nERROR: Xeno.dll not found anywhere in extracted content.")
        print("Files found in stage1:")
        for r, ds, fs in os.walk(stage1):
            for f in fs:
                print(f"  {os.path.join(r, f)}")
        sys.exit(1)

    # Pick the largest match (most likely the real DLL, not a stub)
    matches.sort(key=lambda p: os.path.getsize(p), reverse=True)
    source_dll = matches[0]
    print(f"\n  Found Xeno.dll: {source_dll}")
    print(f"  Size: {os.path.getsize(source_dll):,} bytes")

    # ── Replace the DLL in bin/ ──────────────────────────────────
    old_size = os.path.getsize(TARGET) if os.path.exists(TARGET) else 0
    backup   = TARGET + ".bak"

    if os.path.exists(TARGET):
        shutil.copy2(TARGET, backup)
        print(f"\n  Backed up old Xeno.dll ({old_size:,} bytes) -> {backup}")

    shutil.copy2(source_dll, TARGET)
    new_size = os.path.getsize(TARGET)
    print(f"  Copied new Xeno.dll ({new_size:,} bytes) -> {TARGET}")

    # ── Cleanup temp dirs ────────────────────────────────────────
    print("\n  Cleaning up temp directories...")
    shutil.rmtree(stage1, ignore_errors=True)
    shutil.rmtree(stage2, ignore_errors=True)

    print("\n[OK] Done! Xeno.dll has been replaced successfully.")
    print(f"  Old size : {old_size:,} bytes")
    print(f"  New size : {new_size:,} bytes")


if __name__ == "__main__":
    main()
