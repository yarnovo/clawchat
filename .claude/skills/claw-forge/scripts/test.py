#!/usr/bin/env python3
"""
Test an OpenClaw skill with L1/L2 checks.

Usage:
    test.py --skill-dir <path>

Test layers:
    L1: Static checks (SKILL.md exists, frontmatter valid, name/description ok)
    L2: Script syntax (py_compile all .py files in scripts/)
    L3: Promptfoo evaluation (if promptfooconfig.yaml exists)
"""

import argparse
import os
import py_compile
import re
import subprocess
import sys
from pathlib import Path


class TestResult:
    def __init__(self, name, passed, message=""):
        self.name = name
        self.passed = passed
        self.message = message

    def __str__(self):
        status = "PASS" if self.passed else "FAIL"
        msg = f"  [{status}] {self.name}"
        if self.message:
            msg += f" — {self.message}"
        return msg


def extract_frontmatter(content):
    """Extract frontmatter text from SKILL.md content."""
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return None

    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return "\n".join(lines[1:i])
    return None


def parse_simple_frontmatter(text):
    """Minimal YAML frontmatter parser (no PyYAML dependency)."""
    result = {}
    current_key = None
    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        is_indented = raw_line[:1].isspace()
        if is_indented and current_key:
            existing = result.get(current_key, "")
            result[current_key] = f"{existing} {stripped}".strip() if existing else stripped
            continue

        if ":" not in stripped:
            return None
        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()
        if value in (">", "|", ">-", "|-"):
            value = ""
        if len(value) >= 2 and (
            (value[0] == '"' and value[-1] == '"') or
            (value[0] == "'" and value[-1] == "'")
        ):
            value = value[1:-1]
        result[key] = value
        current_key = key
    return result


def run_l1_checks(skill_dir):
    """L1: Static checks on SKILL.md."""
    results = []
    skill_dir = Path(skill_dir)
    skill_md = skill_dir / "SKILL.md"

    # Check SKILL.md exists
    if not skill_md.exists():
        results.append(TestResult("SKILL.md exists", False, "File not found"))
        return results
    results.append(TestResult("SKILL.md exists", True))

    # Read content
    try:
        content = skill_md.read_text(encoding="utf-8")
    except Exception as e:
        results.append(TestResult("SKILL.md readable", False, str(e)))
        return results
    results.append(TestResult("SKILL.md readable", True))

    # Check frontmatter
    fm_text = extract_frontmatter(content)
    if fm_text is None:
        results.append(TestResult("Frontmatter present", False, "No valid --- delimiters"))
        return results
    results.append(TestResult("Frontmatter present", True))

    fm = parse_simple_frontmatter(fm_text)
    if fm is None:
        results.append(TestResult("Frontmatter parseable", False, "Cannot parse YAML"))
        return results
    results.append(TestResult("Frontmatter parseable", True))

    # Check name
    name = fm.get("name", "")
    if not name:
        results.append(TestResult("name field", False, "Missing or empty"))
    elif not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", name) and len(name) > 1:
        results.append(TestResult("name field", False, f"Invalid format: '{name}' (must be hyphen-case)"))
    elif len(name) > 64:
        results.append(TestResult("name field", False, f"Too long: {len(name)} chars (max 64)"))
    else:
        results.append(TestResult("name field", True, name))

    # Check description
    desc = fm.get("description", "")
    if not desc:
        results.append(TestResult("description field", False, "Missing or empty"))
    elif len(desc) > 1024:
        results.append(TestResult("description field", False, f"Too long: {len(desc)} chars (max 1024)"))
    else:
        results.append(TestResult("description field", True, f"{len(desc)} chars"))

    return results


def run_l2_checks(skill_dir):
    """L2: Syntax check all .py files in scripts/."""
    results = []
    scripts_dir = Path(skill_dir) / "scripts"

    if not scripts_dir.exists():
        results.append(TestResult("scripts/ directory", True, "Not present (optional)"))
        return results

    py_files = sorted(scripts_dir.glob("*.py"))
    if not py_files:
        results.append(TestResult("Python scripts", True, "None found (optional)"))
        return results

    for py_file in py_files:
        try:
            py_compile.compile(str(py_file), doraise=True)
            results.append(TestResult(f"Syntax: {py_file.name}", True))
        except py_compile.PyCompileError as e:
            results.append(TestResult(f"Syntax: {py_file.name}", False, str(e)))

    return results


def run_l3_checks(skill_dir):
    """L3: Promptfoo evaluation (if configured)."""
    results = []
    config_candidates = [
        Path(skill_dir) / "promptfooconfig.yaml",
        Path(skill_dir) / "tests" / "promptfooconfig.yaml",
    ]

    config_path = None
    for candidate in config_candidates:
        if candidate.exists():
            config_path = candidate
            break

    if config_path is None:
        results.append(TestResult("Promptfoo config", True, "Not configured (skipped)"))
        return results

    # Check if promptfoo is available
    try:
        subprocess.run(["promptfoo", "--version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        results.append(TestResult("Promptfoo available", False, "promptfoo CLI not found"))
        return results

    results.append(TestResult("Promptfoo config", True, str(config_path)))

    try:
        proc = subprocess.run(
            ["promptfoo", "eval", "-c", str(config_path), "--no-cache"],
            capture_output=True, text=True, timeout=300
        )
        if proc.returncode == 0:
            results.append(TestResult("Promptfoo eval", True))
        else:
            results.append(TestResult("Promptfoo eval", False, proc.stderr[:200]))
    except subprocess.TimeoutExpired:
        results.append(TestResult("Promptfoo eval", False, "Timed out after 300s"))

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Test an OpenClaw skill (L1/L2/L3 checks)."
    )
    parser.add_argument("--skill-dir", required=True, help="Path to the skill directory")
    args = parser.parse_args()

    skill_dir = Path(args.skill_dir).resolve()
    if not skill_dir.is_dir():
        print(f"[ERROR] Not a directory: {skill_dir}")
        sys.exit(1)

    print(f"Testing skill: {skill_dir}")
    print()

    all_results = []

    # L1
    print("=== L1: Static Checks ===")
    l1 = run_l1_checks(skill_dir)
    all_results.extend(l1)
    for r in l1:
        print(r)
    print()

    # L2
    print("=== L2: Script Syntax ===")
    l2 = run_l2_checks(skill_dir)
    all_results.extend(l2)
    for r in l2:
        print(r)
    print()

    # L3
    print("=== L3: Promptfoo Evaluation ===")
    l3 = run_l3_checks(skill_dir)
    all_results.extend(l3)
    for r in l3:
        print(r)
    print()

    # Summary
    total = len(all_results)
    passed = sum(1 for r in all_results if r.passed)
    failed = total - passed
    score = round(passed / total * 100) if total > 0 else 0

    print("=== Summary ===")
    print(f"  Total:  {total}")
    print(f"  Passed: {passed}")
    print(f"  Failed: {failed}")
    print(f"  Score:  {score}/100")

    if failed > 0:
        print()
        print("Failed checks:")
        for r in all_results:
            if not r.passed:
                print(f"  - {r.name}: {r.message}")
        sys.exit(1)
    else:
        print()
        print("[OK] All checks passed!")


if __name__ == "__main__":
    main()
