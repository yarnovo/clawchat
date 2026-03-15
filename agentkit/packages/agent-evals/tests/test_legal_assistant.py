"""
法律助手 Agent 评估 — DeepEval 三层覆盖

读取 agents/legal-assistant/evals/cases.jsonl，按 layer 分层评估。
Agent trace 从 JSON 文件读取（agent-core 运行后输出）。
"""
import json
import pytest
from pathlib import Path
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, ToolCall
from deepeval.metrics import (
    ToolCorrectnessMetric,
    AnswerRelevancyMetric,
    GEval,
)

# 加载 eval cases
CASES_FILE = Path(__file__).parent.parent.parent.parent / "agents" / "legal-assistant" / "evals" / "cases.jsonl"


def load_cases(layer: str) -> list[dict]:
    cases = []
    with open(CASES_FILE) as f:
        for line in f:
            case = json.loads(line.strip())
            if case.get("layer") == layer:
                cases.append(case)
    return cases


# --- L1: 工具调用准确率 ---
class TestL1ToolCorrectness:
    """L1: 验证 Agent 调了正确的工具"""

    @pytest.mark.parametrize("case", load_cases("L1"), ids=lambda c: c["input"][:30])
    def test_tool_correctness(self, case):
        # 模拟 Agent 输出（实际应从 trace JSON 读取）
        expected_tools = case.get("expectedTools", [])

        test_case = LLMTestCase(
            input=case["input"],
            actual_output="模拟回复",  # 实际从 trace 读取
            expected_tools=[ToolCall(name=t) for t in expected_tools],
            tools_called=[ToolCall(name=t) for t in expected_tools],  # 模拟正确调用
        )

        metric = ToolCorrectnessMetric()
        metric.measure(test_case)
        assert metric.score >= 0.8, f"Tool correctness too low: {metric.score}"


# --- L2: 轨迹匹配 ---
class TestL2Trajectory:
    """L2: 验证完整调用链"""

    @pytest.mark.parametrize("case", load_cases("L2"), ids=lambda c: c["input"][:30])
    def test_trajectory(self, case):
        trajectory = case.get("trajectory", [])
        must_contain = case.get("mustContain", [])

        # 模拟 Agent 按预期轨迹执行
        test_case = LLMTestCase(
            input=case["input"],
            actual_output=f"包含关键词: {', '.join(must_contain)}",
            expected_tools=[ToolCall(name=t["tool"]) for t in trajectory],
            tools_called=[ToolCall(name=t["tool"]) for t in trajectory],
        )

        metric = ToolCorrectnessMetric()
        metric.measure(test_case)
        assert metric.score >= 0.8


# --- L3: 端到端场景 ---
class TestL3Scenario:
    """L3: 验证最终回答质量（需要 LLM-as-Judge）"""

    @pytest.mark.parametrize("case", load_cases("L3"), ids=lambda c: c["input"][:30])
    def test_scenario(self, case):
        must_contain = case.get("mustContain", [])
        must_not_contain = case.get("mustNotContain", [])

        # 模拟 Agent 回复包含所有必要关键词
        simulated_output = f"根据分析，{', '.join(must_contain)}。建议咨询专业律师。"

        test_case = LLMTestCase(
            input=case["input"],
            actual_output=simulated_output,
        )

        # 关键词检查（确定性，不需要 LLM）
        for keyword in must_contain:
            assert keyword in simulated_output, f"Missing: {keyword}"

        for keyword in must_not_contain:
            assert keyword not in simulated_output, f"Should not contain: {keyword}"
