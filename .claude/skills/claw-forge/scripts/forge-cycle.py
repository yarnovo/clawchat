#!/usr/bin/env python3
"""
One cycle of the self-evolving skill forge.

Each invocation:
1. Read next pending idea from ideas.jsonl
2. Run claw-forge forge pipeline (create -> test -> promote -> publish)
3. Record result to history.jsonl
4. If all ideas done, generate new ideas with LLM
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

FORGE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = FORGE_DIR / "scripts"
IDEAS_FILE = FORGE_DIR / "ideas.jsonl"
HISTORY_FILE = FORGE_DIR / "history.jsonl"
OUTPUT_BASE = Path.cwd() / "output"


def load_ideas():
    """Load all ideas from ideas.jsonl."""
    if not IDEAS_FILE.exists():
        return []
    ideas = []
    for line in IDEAS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            ideas.append(json.loads(line))
    return ideas


def save_ideas(ideas):
    """Save all ideas back to ideas.jsonl."""
    lines = [json.dumps(idea, ensure_ascii=False) for idea in ideas]
    IDEAS_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def append_history(record):
    """Append a record to history.jsonl."""
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def get_next_pending(ideas):
    """Get the next pending idea."""
    for idea in ideas:
        if idea.get("status") == "pending":
            return idea
    return None


def run_step(cmd, label, timeout=600):
    """Run a subprocess step, return (success, output)."""
    print(f"  [{label}] Running: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout
        )
        if result.stdout:
            # Print last 5 lines
            lines = result.stdout.strip().splitlines()
            for line in lines[-5:]:
                print(f"    {line}")
        if result.returncode != 0:
            print(f"  [{label}] FAILED (exit {result.returncode})")
            if result.stderr:
                for line in result.stderr.strip().splitlines()[-3:]:
                    print(f"    {line}")
            return False, result.stderr or result.stdout
        print(f"  [{label}] OK")
        return True, result.stdout
    except subprocess.TimeoutExpired:
        print(f"  [{label}] TIMEOUT after {timeout}s")
        return False, "timeout"


def forge_one(idea):
    """Run the full forge pipeline for one idea."""
    name = idea["name"]
    desc = idea["description"]
    output_dir = OUTPUT_BASE / name
    output_dir.mkdir(parents=True, exist_ok=True)

    record = {
        "id": idea["id"],
        "name": name,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "steps": {},
    }

    py = sys.executable

    # Step 1: Create
    ok, out = run_step(
        [py, str(SCRIPTS_DIR / "create.py"),
         "--name", name, "--description", desc,
         "--output", str(OUTPUT_BASE)],
        "CREATE"
    )
    record["steps"]["create"] = {"ok": ok}
    if not ok:
        record["status"] = "failed"
        record["failed_at"] = "create"
        return record

    skill_dir = str(OUTPUT_BASE / name)

    # Step 2: Test
    ok, out = run_step(
        [py, str(SCRIPTS_DIR / "test.py"), "--skill-dir", skill_dir],
        "TEST"
    )
    record["steps"]["test"] = {"ok": ok}
    if not ok:
        record["status"] = "failed"
        record["failed_at"] = "test"
        return record

    # Step 3: Promote (generate promo video)
    promo_output = str(output_dir / "promo")
    ok, out = run_step(
        [py, str(SCRIPTS_DIR / "promote.py"),
         "--skill-dir", skill_dir, "--output", promo_output],
        "PROMOTE",
        timeout=600  # video generation can take a while
    )
    record["steps"]["promote"] = {"ok": ok}
    # promote failure is non-blocking -- we still publish
    if not ok:
        print("  [WARN] Promote failed, continuing to publish without video")

    # Step 4: Publish
    ok, out = run_step(
        [py, str(SCRIPTS_DIR / "publish.py"), "--skill-dir", skill_dir],
        "PUBLISH"
    )
    record["steps"]["publish"] = {"ok": ok}

    # Overall status
    all_ok = all(s.get("ok") for s in record["steps"].values())
    record["status"] = "completed" if all_ok else "partial"
    record["completed_at"] = datetime.now(timezone.utc).isoformat()
    record["output_dir"] = str(output_dir)

    return record


def main():
    print("=" * 60)
    print(f"FORGE CYCLE — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    # Load ideas
    ideas = load_ideas()
    if not ideas:
        print("[INFO] No ideas found in ideas.jsonl. Nothing to do.")
        return

    # Get next pending
    idea = get_next_pending(ideas)
    if idea is None:
        print("[INFO] All ideas have been processed.")
        print("[INFO] To continue, add new ideas to ideas.jsonl")
        # Future: auto-generate new ideas with LLM
        return

    print(f"Next idea: #{idea['id']} {idea['name']}")
    print(f"  {idea['description'][:80]}...")
    print()

    # Mark as in_progress
    idea["status"] = "in_progress"
    save_ideas(ideas)

    # Run forge pipeline
    record = forge_one(idea)

    # Update idea status
    idea["status"] = record.get("status", "failed")
    save_ideas(ideas)

    # Append to history
    append_history(record)

    # Summary
    print()
    print("=" * 60)
    print(f"RESULT: {record['status'].upper()}")
    for step_name, step_result in record["steps"].items():
        status = "OK" if step_result.get("ok") else "FAIL"
        print(f"  {status} {step_name}")
    print()

    # Stats
    pending = sum(1 for i in ideas if i.get("status") == "pending")
    completed = sum(1 for i in ideas if i.get("status") in ("completed", "partial"))
    print(f"Progress: {completed}/{len(ideas)} completed, {pending} pending")
    print("=" * 60)


if __name__ == "__main__":
    main()
