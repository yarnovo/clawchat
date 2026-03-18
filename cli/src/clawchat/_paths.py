"""项目路径常量"""

from pathlib import Path

# cli/src/clawchat/_paths.py → project root = ../../../../
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
STRATEGIES_DIR = PROJECT_ROOT / "strategies"
RECORDS_DIR = PROJECT_ROOT / "records"
ENGINE_BIN = PROJECT_ROOT / "engine" / "target" / "release" / "hft-engine"
