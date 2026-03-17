#!/usr/bin/env python3
"""
Publish an OpenClaw skill to ClawHub.

Usage:
    publish.py --skill-dir <path>

Pipeline:
    1. quick_validate.py — validate skill structure
    2. package_skill.py — package into .skill file
    3. clawhub publish — upload to ClawHub (if CLI available)
"""

import argparse
import subprocess
import sys
from pathlib import Path

# Path to OpenClaw scripts (relative to project root)
OPENCLAW_SCRIPTS = "openclaw/skills/skill-creator/scripts"


def find_project_root():
    """Walk up from this script to find the project root (contains openclaw/)."""
    current = Path(__file__).resolve().parent
    for _ in range(10):
        if (current / "openclaw").is_dir():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    return None


def run_script(script_path, args):
    """Run a Python script and return (success, output)."""
    cmd = [sys.executable, str(script_path)] + args
    print(f"[INFO] Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)

    return result.returncode == 0


def step_validate(skill_dir, scripts_dir):
    """Step 1: Validate skill with quick_validate.py."""
    print("=== Step 1: Validate ===")

    validate_script = scripts_dir / "quick_validate.py"
    if not validate_script.exists():
        print(f"[WARN] quick_validate.py not found at {validate_script}")
        print("[WARN] Skipping validation")
        return True

    return run_script(validate_script, [str(skill_dir)])


def step_package(skill_dir, scripts_dir):
    """Step 2: Package skill into .skill file."""
    print("=== Step 2: Package ===")

    package_script = scripts_dir / "package_skill.py"
    if not package_script.exists():
        print(f"[WARN] package_skill.py not found at {package_script}")
        print("[WARN] Skipping packaging")
        return True, None

    # Output to skill_dir parent (e.g., output/my-skill.skill)
    output_dir = skill_dir.parent
    cmd = [sys.executable, str(package_script), str(skill_dir), str(output_dir)]
    print(f"[INFO] Running: {' '.join(cmd)}")

    # Need to run from the scripts directory so package_skill can find quick_validate
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(scripts_dir))

    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)

    if result.returncode != 0:
        return False, None

    # Find the .skill file
    skill_name = skill_dir.name
    skill_file = output_dir / f"{skill_name}.skill"
    if skill_file.exists():
        return True, skill_file
    return True, None


def step_publish(skill_file):
    """Step 3: Publish to ClawHub using clawhub CLI."""
    print("=== Step 3: Publish to ClawHub ===")

    if skill_file is None:
        print("[WARN] No .skill file to publish")
        return False

    # Check if clawhub CLI is available
    try:
        subprocess.run(["clawhub", "--version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("[WARN] clawhub CLI not found")
        print(f"[INFO] Skill packaged at: {skill_file}")
        print("[INFO] To publish manually, install clawhub CLI and run:")
        print(f"  clawhub publish {skill_file}")
        return True  # Not a failure, just not published

    result = subprocess.run(
        ["clawhub", "publish", str(skill_file)],
        capture_output=True, text=True
    )

    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)

    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(
        description="Publish an OpenClaw skill to ClawHub."
    )
    parser.add_argument("--skill-dir", required=True, help="Path to the skill directory")
    args = parser.parse_args()

    skill_dir = Path(args.skill_dir).resolve()
    if not skill_dir.is_dir():
        print(f"[ERROR] Not a directory: {skill_dir}")
        sys.exit(1)

    print(f"Publishing skill: {skill_dir}")
    print()

    # Find OpenClaw scripts
    project_root = find_project_root()
    if project_root:
        scripts_dir = project_root / OPENCLAW_SCRIPTS
    else:
        scripts_dir = Path("/nonexistent")  # Will trigger WARN messages
        print("[WARN] Project root not found, OpenClaw scripts may be unavailable")

    # Step 1: Validate
    if not step_validate(skill_dir, scripts_dir):
        print()
        print("[ERROR] Validation failed. Fix issues before publishing.")
        sys.exit(1)
    print()

    # Step 2: Package
    success, skill_file = step_package(skill_dir, scripts_dir)
    if not success:
        print()
        print("[ERROR] Packaging failed.")
        sys.exit(1)
    print()

    # Step 3: Publish
    if not step_publish(skill_file):
        print()
        print("[ERROR] Publishing failed.")
        sys.exit(1)

    print()
    print("[OK] Publish pipeline completed!")
    if skill_file:
        print(f"  Package: {skill_file}")


if __name__ == "__main__":
    main()
