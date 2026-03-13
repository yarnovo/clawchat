# ClawChat

微信风格的跨平台聊天应用，集成多通道 AI 网关。

## 架构

```
Flutter App (Web/iOS/Android)
        ↓
   Nginx (80)
   ├── Static → /opt/clawchat/web
   └── /api   → FastAPI (8000)
                    ↓
              OpenClaw Gateway
```

| 组件 | 技术栈 | 说明 |
|------|--------|------|
| `app/` | Flutter / Dart | 跨平台聊天 UI |
| `mcp-server/` | Python / FastAPI | MCP 服务 |
| `cli/` | Go / Cobra | Docker 容器管理工具 |
| `openclaw/` | TypeScript / Node.js | 多通道 AI 助手网关 |
| `deploy/` | Nginx | 反向代理与静态文件服务 |

## 快速开始

```bash
# 安装 git hooks
make setup

# Flutter 应用
make app-run            # 在 Chrome 中运行
make app-serve          # 构建并启动本地服务 (localhost:5555)

# MCP 服务
make mcp-install        # 安装 Python 依赖
make mcp-dev            # 启动开发服务器 (localhost:8000)

# CLI 工具
make cli-build          # 编译
make cli-run            # 运行
```

## 测试

```bash
cd app

# 单元测试 + Widget 测试
flutter test

# Golden 视觉测试（更新基线）
flutter test test/golden/ --update-goldens

# 集成测试
flutter test integration_test/ -d macos
```

## Git Hooks

使用 [lefthook](https://github.com/evilmartians/lefthook) 管理，clone 后执行 `make setup` 安装。

- **pre-commit**: 对暂存的 `app/**/*.dart` 文件运行 `flutter analyze`
