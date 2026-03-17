#!/usr/bin/env python3
"""
Generate a promotional video for an OpenClaw skill.

Usage:
    promote.py --skill-dir <path> [--output ./output/]

Pipeline:
    1. Seed-2.0-pro  → creative brief (tagline, first frame prompt, video prompt)
    2. Seedream       → first frame image (1920x1080)
    3. Seedance       → 5-second promo video

Requires: ARK_API_KEY environment variable.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

# Resolve poll_task from same directory
_SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPT_DIR))
from poll_task import poll_task  # noqa: E402

ARK_BASE = "https://ark.cn-beijing.volces.com"
ARK_API_KEY = os.environ.get("ARK_API_KEY", "")


def ark_post(path, payload):
    """Send POST request to Volcengine Ark API."""
    url = f"{ARK_BASE}{path}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ARK_API_KEY}",
    })
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def parse_skill_frontmatter(skill_dir):
    """Read SKILL.md and extract name + description from frontmatter."""
    skill_md = Path(skill_dir) / "SKILL.md"
    if not skill_md.exists():
        raise FileNotFoundError(f"SKILL.md not found in {skill_dir}")

    content = skill_md.read_text(encoding="utf-8")
    lines = content.splitlines()

    if not lines or lines[0].strip() != "---":
        raise ValueError("SKILL.md has no valid frontmatter")

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break

    if end_idx is None:
        raise ValueError("SKILL.md frontmatter is not closed")

    frontmatter_text = "\n".join(lines[1:end_idx])

    # Simple key-value parser (no PyYAML dependency)
    result = {}
    current_key = None
    for raw_line in frontmatter_text.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        is_indented = raw_line[:1].isspace()
        if is_indented and current_key:
            existing = result.get(current_key, "")
            result[current_key] = f"{existing} {stripped}".strip() if existing else stripped
            continue

        if ":" not in stripped:
            continue
        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()
        # Strip YAML block scalar indicators
        if value in (">", "|", ">-", "|-"):
            value = ""
        # Strip quotes
        if len(value) >= 2 and (
            (value[0] == '"' and value[-1] == '"') or
            (value[0] == "'" and value[-1] == "'")
        ):
            value = value[1:-1]
        result[key] = value
        current_key = key

    name = result.get("name", "")
    description = result.get("description", "")

    if not name:
        raise ValueError("SKILL.md frontmatter missing 'name'")
    if not description:
        raise ValueError("SKILL.md frontmatter missing 'description'")

    return name, description


def step1_generate_prompts(skill_name, skill_description):
    """Use Seed-2.0-pro to generate video creative brief from skill description."""
    print("[Step 1/3] Generating creative brief with Seed-2.0-pro...")

    system_prompt = """你是一个专业的AI视频创意总监。根据给定的技能描述，生成一段5秒宣传视频的创意方案。

输出 JSON 格式：
{
  "tagline": "一句话卖点（不超过15字）",
  "first_frame_prompt": "Seedream首帧图片提示词，要包含主体物、场景、光影、构图，末尾加'视频静帧画面'",
  "video_prompt": "Seedance视频提示词，包含[主体]+[动作]+[场景]+[风格]+[镜头运动]",
  "style": "写实|动画|扁平|赛博朋克|简约科技"
}

要求：
1. 5秒内抓住注意力
2. 画面要有明确的动态变化
3. 风格偏科技感/未来感
4. 不要出现文字
5. 首帧提示词末尾包含"视频静帧画面"
"""

    resp = ark_post("/api/v3/chat/completions", {
        "model": "doubao-seed-2-0-pro-260215",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"技能名称：{skill_name}\n技能描述：{skill_description}\n\n请只输出 JSON，不要输出其他内容。"}
        ],
        "temperature": 0.8,
    })

    content = resp["choices"][0]["message"]["content"].strip()
    # Extract JSON from possible markdown code block
    if content.startswith("```"):
        lines = content.splitlines()
        start = 1 if lines[0].startswith("```") else 0
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        content = "\n".join(lines[start:end])
    brief = json.loads(content)

    required_fields = ["tagline", "first_frame_prompt", "video_prompt", "style"]
    for field in required_fields:
        if field not in brief:
            raise ValueError(f"Creative brief missing required field: {field}")

    print(f"  Tagline: {brief['tagline']}")
    print(f"  Style:   {brief['style']}")
    print(f"  [OK] Creative brief generated")
    return brief


def step2_generate_first_frame(prompt):
    """Use Seedream to generate first frame image."""
    print("[Step 2/3] Generating first frame with Seedream...")

    resp = ark_post("/api/v3/images/generations", {
        "model": "doubao-seedream-5-0-260128",
        "prompt": prompt,
        "response_format": "url",
        "size": "2560x1440",
    })

    image_url = resp["data"][0]["url"]
    print(f"  [OK] First frame generated: {image_url[:80]}...")
    return image_url


def step3_generate_video(image_url, video_prompt):
    """Use Seedance to generate video from first frame + prompt."""
    print("[Step 3/3] Generating video with Seedance...")

    # Create async task
    resp = ark_post("/api/v3/contents/generations/tasks", {
        "model": "doubao-seedance-1-5-pro-251215",
        "content": [
            {"type": "image_url", "image_url": {"url": image_url}, "role": "first_frame"},
            {"type": "text", "text": video_prompt}
        ],
        "ratio": "16:9",
        "duration": 5,
        "resolution": "720p",
        "generate_audio": False,
        "watermark": False,
    })

    task_id = resp["id"]
    print(f"  Video task created: {task_id}")
    print(f"  Polling for completion...")

    video_url = poll_task(task_id)
    print(f"  [OK] Video generated")
    return video_url


def download_file(url, output_path):
    """Download a file from URL to local path."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, str(output_path))
    print(f"  Saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate a promotional video for an OpenClaw skill."
    )
    parser.add_argument(
        "--skill-dir", required=True,
        help="Path to the skill directory (must contain SKILL.md)"
    )
    parser.add_argument(
        "--output", default="./output/",
        help="Output directory for generated files (default: ./output/)"
    )
    args = parser.parse_args()

    if not ARK_API_KEY:
        print("[ERROR] ARK_API_KEY environment variable is not set")
        sys.exit(1)

    try:
        # Parse skill info
        skill_name, skill_description = parse_skill_frontmatter(args.skill_dir)
        print(f"Skill: {skill_name}")
        print(f"Description: {skill_description[:80]}...")
        print()

        # Step 1: Generate creative brief
        brief = step1_generate_prompts(skill_name, skill_description)
        print()

        # Save brief for reference
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)
        brief_path = output_dir / "creative_brief.json"
        brief_path.write_text(json.dumps(brief, ensure_ascii=False, indent=2))
        print(f"Creative brief saved to: {brief_path}")

        # Step 2: Generate first frame
        image_url = step2_generate_first_frame(brief["first_frame_prompt"])
        print()

        # Download first frame
        first_frame_path = output_dir / "first_frame.png"
        download_file(image_url, first_frame_path)

        # Step 3: Generate video
        video_url = step3_generate_video(image_url, brief["video_prompt"])
        print()

        # Download video
        promo_path = output_dir / "promo.mp4"
        download_file(video_url, promo_path)

        print()
        print(f"[OK] Promo video generated successfully!")
        print(f"  Tagline:     {brief['tagline']}")
        print(f"  First frame: {first_frame_path}")
        print(f"  Video:       {promo_path}")

    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
    except KeyError as e:
        print(f"[ERROR] Unexpected API response format: missing key {e}")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"[ERROR] HTTP {e.code}: {body[:500]}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"[ERROR] Network error: {e.reason}")
        sys.exit(1)
    except RuntimeError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
