import { Hono } from 'hono';

export const containers = new Hono();

// 容器生命周期
containers.post('/run', async (c) => {
  // TODO: docker run <image> → 返回容器 ID + Channel 端口
  const { agentId } = await c.req.json();
  return c.json({ containerId: 'todo', channelUrl: 'http://localhost:4000' });
});

containers.post('/stop', async (c) => {
  // TODO: docker stop <containerId>
  const { containerId } = await c.req.json();
  return c.json({ stopped: containerId });
});

containers.post('/fork', async (c) => {
  // TODO: docker commit <containerId> → docker run <newImage>
  const { containerId } = await c.req.json();
  return c.json({ newContainerId: 'todo', newImageId: 'todo' });
});

containers.post('/commit', async (c) => {
  // TODO: docker commit <containerId> → 保存为新镜像
  const { containerId } = await c.req.json();
  return c.json({ imageId: 'todo' });
});

containers.get('/', (c) => {
  // TODO: docker ps --filter label=agentkit
  return c.json({ containers: [] });
});
