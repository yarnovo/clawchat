import { describe, it, expect, vi } from "vitest";

// Mock docker module (requires Docker daemon which isn't available in CI)
vi.mock("../docker.js", () => ({
  pingDocker: vi.fn(async () => true),
  listContainers: vi.fn(async () => []),
  createContainer: vi.fn(async ({ name }) => ({
    containerId: `mock-${name}`,
  })),
  getContainer: vi.fn(async (id: string) =>
    id === "existing"
      ? { Id: "existing", State: { Status: "running" } }
      : null,
  ),
  startContainer: vi.fn(async () => {}),
  stopContainer: vi.fn(async () => {}),
  removeContainer: vi.fn(async () => {}),
  getContainerLogs: vi.fn(async () => "mock logs output"),
  createVolume: vi.fn(async () => {}),
  removeVolume: vi.fn(async () => {}),
}));

import app from "../app.js";

const request = (path: string, init?: RequestInit) => {
  const url = path === "/" ? "/v1/containers" : `/v1/containers${path}`;
  return app.request(url, init);
};

const jsonReq = (method: string, body?: object) => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body && { body: JSON.stringify(body) }),
});

describe("Health", () => {
  it("GET /health 返回 ok", async () => {
    const res = await request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("Containers", () => {
  it("GET / 列出容器", async () => {
    const res = await request("/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("POST / 缺少必填字段返回 400", async () => {
    const res = await request("/", jsonReq("POST", { name: "test" }));
    expect(res.status).toBe(400);
  });

  it("POST / 创建容器成功", async () => {
    const res = await request(
      "/",
      jsonReq("POST", { name: "test-container", image: "alpine:latest" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.containerId).toBe("mock-test-container");
  });

  it("GET /:id 存在的容器", async () => {
    const res = await request("/existing");
    expect(res.status).toBe(200);
  });

  it("GET /:id 不存在返回 404", async () => {
    const res = await request("/nonexistent");
    expect(res.status).toBe(404);
  });

  it("POST /:id/start 启动容器", async () => {
    const res = await request("/existing/start", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("POST /:id/stop 停止容器", async () => {
    const res = await request("/existing/stop", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("DELETE /:id 删除容器", async () => {
    const res = await request("/existing", { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("GET /:id/logs 获取日志", async () => {
    const res = await request("/existing/logs");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logs).toBe("mock logs output");
  });
});

describe("Volumes", () => {
  it("POST /volumes 缺少 name 返回 400", async () => {
    const res = await request("/volumes", jsonReq("POST", {}));
    expect(res.status).toBe(400);
  });

  it("POST /volumes 创建 volume", async () => {
    const res = await request(
      "/volumes",
      jsonReq("POST", { name: "test-vol" }),
    );
    expect(res.status).toBe(201);
  });

  it("DELETE /volumes/:name 删除 volume", async () => {
    const res = await request("/volumes/test-vol", { method: "DELETE" });
    expect(res.status).toBe(200);
  });
});
