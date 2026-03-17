# agentkit-base — Agent 运行时容器镜像
#
# 构建: docker build -t agentkit-base:latest -f agentkit/agentkit-base/Dockerfile .
# 需要从 monorepo 根目录构建（因为 COPY agentkit/）

FROM node:22

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.32.0 --activate

WORKDIR /app

# 1. 复制 agentkit 源码
COPY agentkit/package.json agentkit/pnpm-lock.yaml agentkit/pnpm-workspace.yaml ./

# 复制各子包的 package.json（先复制 package.json 利用 Docker 缓存）
COPY agentkit/core/package.json core/package.json
COPY agentkit/event-loop/package.json event-loop/package.json
COPY agentkit/agentic/package.json agentic/package.json
COPY agentkit/provider-llm-openai/package.json provider-llm-openai/package.json
COPY agentkit/provider-session-sqlite/package.json provider-session-sqlite/package.json
COPY agentkit/extension-skills/package.json extension-skills/package.json
COPY agentkit/extension-memory/package.json extension-memory/package.json
COPY agentkit/channel-http/package.json channel-http/package.json
COPY agentkit/channel-scheduler/package.json channel-scheduler/package.json
COPY agentkit/eval/package.json eval/package.json
COPY agentkit/cli/package.json cli/package.json

# 2. 允许 native module 构建 + 安装依赖
RUN echo '{"pnpm":{"onlyBuiltDependenciesFile":null}}' > /tmp/pnpm-patch.json && \
    node -e "const p=require('./package.json'); p.pnpm={onlyBuiltDependencies:['better-sqlite3','esbuild']}; require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2))" && \
    pnpm install --frozen-lockfile

# 3. 复制源码并构建
COPY agentkit/core/ core/
COPY agentkit/event-loop/ event-loop/
COPY agentkit/agentic/ agentic/
COPY agentkit/provider-llm-openai/ provider-llm-openai/
COPY agentkit/provider-session-sqlite/ provider-session-sqlite/
COPY agentkit/extension-skills/ extension-skills/
COPY agentkit/extension-memory/ extension-memory/
COPY agentkit/channel-http/ channel-http/
COPY agentkit/channel-scheduler/ channel-scheduler/
COPY agentkit/eval/ eval/
COPY agentkit/cli/ cli/

RUN pnpm -r build

# 4. 工作区挂载点
VOLUME /workspace

EXPOSE 4000

# 健康检查（用 node 代替 curl）
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# 默认启动: serve /workspace on port 4000
CMD ["node", "cli/dist/main.js", "serve", "/workspace", "--port", "4000"]
