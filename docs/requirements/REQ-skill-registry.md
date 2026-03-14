---
status: open
created: 2026-03-14 20:30
---
# 需求报告：ClawHub 兼容技能注册表（Skill Registry）

## 1. Who（主体 + 场景）

### 使用者
- **Agent 用户**：通过 ClawChat 创建并使用 Agent 的人，需要给 Agent 安装技能（如 Slack、GitHub、Notion 集成）
- **技能开发者**：开发自定义技能并发布到注册表，供其他用户安装
- **平台运营**：管理技能目录，审核安全性，控制技能生态

### 使用场景
- 用户在对话中对 Agent 说"装个 Slack 技能"，Agent 通过 `clawhub install slack` 从注册表下载安装
- 开发者发布企业内部工具的技能包，仅限 ClawChat 用户使用
- 平台同步 ClawHub 官方热门技能，提供国内可用的下载源

## 2. Why（动机）

### 痛点
1. **ClawHub 官方源国内访问慢**：Agent 容器内 `clawhub install` 直连美国服务器，下载慢甚至超时
2. **安全不可控**：ClawHavoc 事件（2026.02）暴露了公共注册表的供应链风险，341 个恶意技能被发现
3. **无法托管私有技能**：企业或平台自有的技能包无处发布
4. **多运行时割裂**：ClawChat 支持 OpenClaw/NanoClaw/IronClaw 三个运行时，技能生态缺乏统一管理入口

### 做了的价值
- Agent 技能安装从 10s+ 降到 <1s（国内 CDN）
- 平台可审核技能安全性，过滤恶意技能
- 支持私有技能发布，构建 ClawChat 差异化生态
- 为未来技能付费、企业专属技能市场打基础

### 不做的代价
- 技能安装依赖外网，国内用户体验差
- 安全完全依赖 ClawHub 官方审核，平台无控制力
- 错过技能生态的卡位窗口期

## 3. What（能力声明）

### 核心能力

**C1. ClawHub 协议兼容**
- 实现 ClawHub 的 `.well-known/clawhub.json` 发现协议
- 实现 `/api/v1/*` 核心 API 端点（search、resolve、download、skills CRUD）
- `clawhub` CLI 通过 `CLAWHUB_REGISTRY` 环境变量即可切换到本注册表，无需修改 CLI

**C2. 官方同步**
- 从 ClawHub 官方注册表同步技能（按需代理 + 后台定期同步）
- 首次请求未缓存的技能时，代理到 ClawHub 下载并缓存到本地
- 后台任务定期同步热门技能的新版本

**C3. 本地发布**
- 支持通过 `clawhub publish` 发布技能到本注册表
- 认证对接 ClawChat 账号体系（JWT）
- 技能包存储在本地文件系统或对象存储

**C4. Agent 容器自动对接**
- Agent 容器启动时自动注入 `CLAWHUB_REGISTRY` 环境变量，指向本注册表
- 无需用户手动配置，对 Agent 透明

**C5. 技能管理**
- 技能列表、搜索、版本查看
- 技能上下架（管理员能力）
- 区分来源：`synced`（同步自 ClawHub）vs `local`（本地发布）

### 不做（Out of Scope）
- 前端管理界面（MVP 阶段通过 API 管理）
- 向量语义搜索（MVP 用关键词搜索）
- 技能评分、评论、收藏（后续迭代）
- 付费技能、订阅机制
- NanoClaw/IronClaw 的技能格式兼容（它们有各自的 skills 机制，暂不统一）

## 4. Acceptance（验收标准）

### C1. ClawHub 协议兼容
- [ ] `GET /.well-known/clawhub.json` 返回 `{ "apiBase": "<registry-url>" }`
- [ ] `CLAWHUB_REGISTRY=<registry-url> clawhub search "github"` 返回搜索结果
- [ ] `CLAWHUB_REGISTRY=<registry-url> clawhub install github` 成功下载并安装 github 技能
- [ ] `GET /api/v1/resolve?slug=github&version=latest` 返回版本信息
- [ ] `GET /api/v1/download?slug=github&version=1.0.0` 返回技能 ZIP 包

### C2. 官方同步
- [ ] 首次请求未缓存的技能时，自动从 ClawHub 下载并缓存，第二次请求直接返回本地缓存
- [ ] 后台同步任务运行后，热门技能（下载量 Top 100）的最新版本存在于本地
- [ ] ClawHub 不可达时，已缓存的技能仍可正常下载

### C3. 本地发布
- [ ] `CLAWHUB_REGISTRY=<registry-url> clawhub publish ./my-skill` 成功发布技能
- [ ] 发布需要有效的 ClawChat JWT token（`Authorization: Bearer <token>`）
- [ ] 发布的技能可通过 search 和 install 正常使用
- [ ] 本地发布的技能 slug 与 ClawHub 官方技能 slug 冲突时，拒绝发布并报错

### C4. Agent 容器自动对接
- [ ] 通过 `make dev` 启动后，新创建的 Agent 容器中 `echo $CLAWHUB_REGISTRY` 输出本注册表地址
- [ ] Agent 在对话中执行 `clawhub install` 时走本注册表而非官方源

### C5. 技能管理
- [ ] `GET /api/v1/skills` 返回分页的技能列表，包含 `source` 字段（`synced` 或 `local`）
- [ ] `DELETE /api/v1/skills/:slug`（管理员）成功下架指定技能
- [ ] 下架的技能不再出现在搜索结果中，且 `clawhub install` 返回 404

## 5. Constraint（约束）

### 业务约束
- 必须兼容 ClawHub 协议，不修改 `clawhub` CLI——用户只需设置 `CLAWHUB_REGISTRY` 即可切换
- 本地发布的技能 slug 不可与 ClawHub 官方技能冲突（避免供应链攻击）
- 同步自 ClawHub 的技能保留原始元数据（作者、版本、changelog）

### 技术约束
- 技术栈：Hono + TypeScript + PostgreSQL + Prisma，与 ClawChat 现有服务一致
- 新服务名 `skill-registry-server`，端口 `3007`
- nginx 路由：`/.well-known/clawhub.json` 和 `/api/v1/*` 代理到 skill-registry-server
- 注意：`/api/v1/*` 路由与现有 `/v1/*` 路由不冲突（前缀不同）
- 技能 ZIP 包存储：MVP 阶段本地文件系统（`/data/skills/`），后续可换对象存储
- Docker Compose：新增服务定义，依赖 PostgreSQL（数据库 `clawchat_skills`）
- CI/CD：新增镜像构建和推送步骤

### 不可打破的现有行为
- 现有 Agent 容器如果未配置 `CLAWHUB_REGISTRY`，仍使用 ClawHub 官方源（向前兼容）
- `openclaw-server/src/instance.ts` 中 `buildEnv()` 的现有环境变量不可移除或重命名
- nginx 中现有的 `/v1/*` 路由规则不可改变

## 参考

### 关键文件路径
| 文件 | 用途 |
|------|------|
| `openclaw-server/src/instance.ts` | 容器环境变量构建，需在 `buildEnv()` 中添加 `CLAWHUB_REGISTRY` |
| `container-server/src/docker.ts` | Docker 容器创建，环境变量传递（无需修改） |
| `openclaw-server/entrypoint.sh` | 容器启动入口（无需修改，env 直接透传） |
| `deploy/nginx/default.conf` | nginx 路由，需添加 `/.well-known` 和 `/api/v1/` |
| `docker-compose.yml` | 本地开发编排，需添加 skill-registry-server |
| `docker-compose.deploy.yml` | 线上部署编排，需添加 skill-registry-server |
| `.github/workflows/release.yml` | CI/CD，需添加镜像构建步骤 |
| `Makefile` | 开发命令，需添加 `logs-skill-registry` 等 |

### ClawHub API 协议（需实现的端点）
| 端点 | 方法 | 功能 | 认证 |
|------|------|------|------|
| `/.well-known/clawhub.json` | GET | Registry 发现 | 否 |
| `/api/v1/search` | GET | 搜索技能（`?query=&limit=`） | 否 |
| `/api/v1/resolve` | GET | 版本解析（`?slug=&version=`） | 否 |
| `/api/v1/download` | GET | 下载 ZIP（`?slug=&version=`） | 否 |
| `/api/v1/skills` | GET | 技能列表（分页） | 否 |
| `/api/v1/skills` | POST | 发布新版本 | 是 |
| `/api/v1/skills/:slug` | GET | 技能详情 | 否 |
| `/api/v1/skills/:slug` | DELETE | 下架 | 是（管理员） |
| `/api/v1/whoami` | GET | 验证 token | 是 |

### 数据模型参考
```
Skill: slug, displayName, summary, tags[], source(synced|local), ownerId?,
       createdAt, updatedAt, isActive
SkillVersion: skillId, version, changelog, zipPath, zipHash, fileCount,
              totalSize, publishedAt, syncedFrom?
SyncState: lastSyncAt, lastSyncCursor, syncStatus
```

### 可复用模块
- JWT 认证：复用 `agent-server/src/auth.ts` 的 `verifyToken` + `authMiddleware`
- 请求 ID 中间件：复用现有 `middleware/request-id.ts`
- Prometheus 指标：复用现有 `metrics.ts` 模式
- 健康检查：复用现有 health route 模式

## 过程备注

- [确认] ClawHub 原生支持 `CLAWHUB_REGISTRY` 环境变量切换源，无需修改 CLI
- [确认] ClawHub 仓库 MIT 开源，但后端绑定 Convex（hosted BaaS），直接 fork 不可行
- [确认] `openclaw-server/src/instance.ts` 的 `buildEnv()` 当前未注入 `CLAWHUB_REGISTRY`，这是需要改动的唯一入口
- [确认] ClawChat 的 `/v1/*` 路由与 ClawHub 的 `/api/v1/*` 路由前缀不冲突
- [惊讶] ClawHub 使用 `.well-known/clawhub.json` 发现协议，比预期更标准化，兼容成本很低
