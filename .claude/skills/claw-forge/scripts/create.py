#!/usr/bin/env python3
"""
Create a new OpenClaw skill from a one-line description.

Usage:
    create.py --name <skill-name> --description "<desc>" --output ./output/

Tries to use OpenClaw's init_skill.py if available, otherwise generates
a skeleton directory with SKILL.md template.
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

# Path to OpenClaw's init_skill.py (relative to project root)
OPENCLAW_INIT_SCRIPT = "openclaw/skills/skill-creator/scripts/init_skill.py"

SKILL_TEMPLATE = """---
name: {name}
description: >
  {description}
---

# {title}

## Overview

{description}

## Usage

[TODO: Add usage instructions]

## Scripts

[TODO: Add scripts as needed]
"""


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


def normalize_name(name):
    """Normalize skill name to lowercase hyphen-case."""
    normalized = name.strip().lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = normalized.strip("-")
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized


def title_case(name):
    """Convert hyphenated name to Title Case."""
    return " ".join(word.capitalize() for word in name.split("-"))


def create_with_init_script(init_script, name, output_dir):
    """Use OpenClaw's init_skill.py to create the skeleton."""
    cmd = [
        sys.executable, str(init_script),
        name,
        "--path", str(output_dir),
        "--resources", "scripts,references",
    ]
    print(f"[INFO] Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)

    return result.returncode == 0


def create_skeleton(name, description, output_dir):
    """Generate a skill skeleton directly."""
    skill_dir = Path(output_dir) / name
    if skill_dir.exists():
        print(f"[ERROR] Directory already exists: {skill_dir}")
        return False

    skill_dir.mkdir(parents=True)
    (skill_dir / "scripts").mkdir()
    (skill_dir / "references").mkdir()

    title = title_case(name)
    content = SKILL_TEMPLATE.format(
        name=name,
        description=description,
        title=title,
    )
    (skill_dir / "SKILL.md").write_text(content, encoding="utf-8")

    print(f"[OK] Created skill skeleton at {skill_dir}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Create a new OpenClaw skill from a description."
    )
    parser.add_argument("--name", required=True, help="Skill name (will be normalized)")
    parser.add_argument("--description", required=True, help="One-line skill description")
    parser.add_argument("--output", default="./output/", help="Output directory (default: ./output/)")
    args = parser.parse_args()

    name = normalize_name(args.name)
    if not name:
        print("[ERROR] Skill name must include at least one letter or digit.")
        sys.exit(1)

    if name != args.name:
        print(f"[INFO] Normalized skill name: '{args.name}' -> '{name}'")

    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    # Try OpenClaw's init_skill.py first
    project_root = find_project_root()
    init_script = None
    if project_root:
        candidate = project_root / OPENCLAW_INIT_SCRIPT
        if candidate.exists():
            init_script = candidate

    if init_script:
        print(f"[INFO] Using OpenClaw init_skill.py: {init_script}")
        success = create_with_init_script(init_script, name, output_dir)
    else:
        print("[INFO] OpenClaw init_skill.py not found, generating skeleton directly")
        success = create_skeleton(name, args.description, output_dir)

    if not success:
        print("[ERROR] Failed to create skill")
        sys.exit(1)

    skill_dir = output_dir / name
    print()
    print(f"[OK] Skill '{name}' created at: {skill_dir}")
    print()
    print("Next steps:")
    print("  1. Edit SKILL.md to flesh out the description and usage")
    print("  2. Add scripts to scripts/ as needed")
    print(f"  3. Test with: python3 test.py --skill-dir {skill_dir}")


if __name__ == "__main__":
    main()
