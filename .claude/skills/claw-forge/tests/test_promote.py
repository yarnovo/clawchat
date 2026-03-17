#!/usr/bin/env python3
"""
Unit tests for promote.py pipeline.

Uses mock to avoid real API calls.
Run: pytest tests/test_promote.py -v
"""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Add scripts directory to path
SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from promote import (  # noqa: E402
    parse_skill_frontmatter,
    step1_generate_prompts,
)

# Sample API response for step1
MOCK_STEP1_RESPONSE = {
    "choices": [{
        "message": {
            "content": json.dumps({
                "tagline": "AI天气一目了然",
                "first_frame_prompt": "一个发光的全息地球仪悬浮在深色背景中，表面有流动的气象云图和数据流，简约科技风格，视频静帧画面",
                "video_prompt": "全息地球仪缓慢旋转，表面气象云图流动变化，数据粒子从地球表面飘散上升，深色背景中有微弱的网格线，简约科技风格，镜头缓慢推进",
                "style": "简约科技"
            }, ensure_ascii=False)
        }
    }]
}


@pytest.fixture
def sample_skill_dir(tmp_path):
    """Create a temporary skill directory with SKILL.md."""
    skill_dir = tmp_path / "weather-query"
    skill_dir.mkdir()
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text("""---
name: weather-query
description: >
  查询全球城市天气信息，支持当前天气和未来7天预报
---

# Weather Query

查询天气的技能。
""")
    return skill_dir


class TestParseSkillFrontmatter:
    """Tests for parse_skill_frontmatter."""

    def test_valid_frontmatter(self, sample_skill_dir):
        name, desc = parse_skill_frontmatter(sample_skill_dir)
        assert name == "weather-query"
        assert "天气" in desc

    def test_missing_skill_md(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            parse_skill_frontmatter(tmp_path)

    def test_no_frontmatter(self, tmp_path):
        skill_dir = tmp_path / "bad-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("No frontmatter here")
        with pytest.raises(ValueError, match="no valid frontmatter"):
            parse_skill_frontmatter(skill_dir)

    def test_missing_name(self, tmp_path):
        skill_dir = tmp_path / "no-name"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("---\ndescription: test\n---\n")
        with pytest.raises(ValueError, match="missing 'name'"):
            parse_skill_frontmatter(skill_dir)


class TestStep1OutputFormat:
    """Tests for step1_generate_prompts output format."""

    @patch("promote.ark_post", return_value=MOCK_STEP1_RESPONSE)
    def test_step1_output_format(self, mock_post):
        result = step1_generate_prompts("weather-query", "查询天气")
        assert isinstance(result, dict)

    @patch("promote.ark_post", return_value=MOCK_STEP1_RESPONSE)
    def test_step1_has_required_fields(self, mock_post):
        result = step1_generate_prompts("weather-query", "查询天气")
        assert "tagline" in result
        assert "first_frame_prompt" in result
        assert "video_prompt" in result
        assert "style" in result

    @patch("promote.ark_post", return_value=MOCK_STEP1_RESPONSE)
    def test_video_prompt_has_motion(self, mock_post):
        """Video prompt should contain motion/dynamic description."""
        result = step1_generate_prompts("weather-query", "查询天气")
        video_prompt = result["video_prompt"]
        # Check for motion-related keywords (Chinese)
        motion_keywords = [
            "旋转", "推进", "移动", "飘", "流动", "变化",
            "升", "降", "跟随", "运动", "漂浮", "闪烁",
        ]
        has_motion = any(kw in video_prompt for kw in motion_keywords)
        assert has_motion, f"Video prompt lacks motion keywords: {video_prompt}"

    @patch("promote.ark_post", return_value=MOCK_STEP1_RESPONSE)
    def test_tagline_length(self, mock_post):
        result = step1_generate_prompts("weather-query", "查询天气")
        assert len(result["tagline"]) <= 15

    @patch("promote.ark_post", return_value=MOCK_STEP1_RESPONSE)
    def test_style_is_valid(self, mock_post):
        result = step1_generate_prompts("weather-query", "查询天气")
        valid_styles = {"写实", "动画", "扁平", "赛博朋克", "简约科技"}
        assert result["style"] in valid_styles


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
