#!/usr/bin/env python3
"""
Generic async task poller for Volcengine Ark API.

Usage:
    poll_task.py --task-id <task_id> [--interval 5] [--max-attempts 60]

Polls GET /api/v3/contents/generations/tasks/{task_id} until
the task succeeds, fails, or the timeout is reached.
"""

import argparse
import json
import os
import sys
import time
import urllib.request

ARK_BASE = "https://ark.cn-beijing.volces.com"
ARK_API_KEY = os.environ.get("ARK_API_KEY", "")

DEFAULT_INTERVAL = 5  # seconds
DEFAULT_MAX_ATTEMPTS = 60  # 5 minutes at 5s interval


def ark_get(path):
    """Send GET request to Volcengine Ark API."""
    url = f"{ARK_BASE}{path}"
    req = urllib.request.Request(url, method="GET", headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ARK_API_KEY}",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def poll_task(task_id, interval=DEFAULT_INTERVAL, max_attempts=DEFAULT_MAX_ATTEMPTS):
    """
    Poll an async task until completion.

    Args:
        task_id: The task ID to poll.
        interval: Seconds between poll attempts.
        max_attempts: Maximum number of poll attempts.

    Returns:
        The video URL on success.

    Raises:
        RuntimeError: If the task fails or times out.
    """
    if not ARK_API_KEY:
        raise RuntimeError("ARK_API_KEY environment variable is not set")

    path = f"/api/v3/contents/generations/tasks/{task_id}"

    for attempt in range(1, max_attempts + 1):
        try:
            resp = ark_get(path)
        except Exception as e:
            print(f"[WARN] Poll attempt {attempt}/{max_attempts} failed: {e}")
            time.sleep(interval)
            continue

        status = resp.get("status", "unknown")
        print(f"[INFO] Attempt {attempt}/{max_attempts}: status={status}")

        if status == "succeeded":
            # Try multiple response formats
            content = resp.get("content", [])

            # Format 1: content is a list of objects
            if isinstance(content, list):
                for item in content:
                    if isinstance(item, dict):
                        if item.get("type") == "video_url":
                            url = item.get("video_url", {}).get("url", "")
                            if url:
                                return url
                        url = item.get("url", "")
                        if url:
                            return url
                    elif isinstance(item, str) and item.startswith("http"):
                        return item

            # Format 2: content is a dict with video_url
            if isinstance(content, dict):
                url = content.get("video_url", "") or content.get("url", "")
                if url:
                    return url

            # Format 3: content is a direct URL string
            if isinstance(content, str) and content.startswith("http"):
                return content

            # Format 4: look in top-level response fields
            for key in ("video_url", "output_url", "url", "result"):
                val = resp.get(key, "")
                if isinstance(val, str) and val.startswith("http"):
                    return val
                if isinstance(val, dict):
                    url = val.get("url", "")
                    if url:
                        return url

            raise RuntimeError(
                f"Task succeeded but no video URL found in response: {json.dumps(resp, ensure_ascii=False)[:500]}"
            )

        if status == "failed":
            error = resp.get("error", {})
            msg = error.get("message", "Unknown error")
            code = error.get("code", "unknown")
            raise RuntimeError(f"Task failed: [{code}] {msg}")

        time.sleep(interval)

    raise RuntimeError(
        f"Task {task_id} did not complete within {max_attempts * interval} seconds"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Poll a Volcengine Ark async task until completion."
    )
    parser.add_argument("--task-id", required=True, help="The task ID to poll")
    parser.add_argument(
        "--interval", type=int, default=DEFAULT_INTERVAL,
        help=f"Seconds between poll attempts (default: {DEFAULT_INTERVAL})"
    )
    parser.add_argument(
        "--max-attempts", type=int, default=DEFAULT_MAX_ATTEMPTS,
        help=f"Maximum number of poll attempts (default: {DEFAULT_MAX_ATTEMPTS})"
    )
    args = parser.parse_args()

    if not ARK_API_KEY:
        print("[ERROR] ARK_API_KEY environment variable is not set")
        sys.exit(1)

    try:
        video_url = poll_task(args.task_id, args.interval, args.max_attempts)
        print(f"[OK] Video URL: {video_url}")
    except RuntimeError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
