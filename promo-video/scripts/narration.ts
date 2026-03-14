/**
 * 旁白文案 — 每个场景的解说词
 *
 * 原则：每段旁白必须短于场景时长（减去延迟和淡出）
 *
 * 场景时间（30fps）：
 *   Intro:       0-89    (3s)   → 旁白 ≤ 2.5s
 *   PainPoints:  90-239  (5s)   → 旁白 ≤ 4s
 *   Solution:    240-359 (4s)   → 旁白 ≤ 3.5s
 *   Chat:        360-539 (6s)   → 旁白 ≤ 5s
 *   Capabilities:540-719 (6s)   → 旁白 ≤ 5s
 *   Positioning: 720-809 (3s)   → 旁白 ≤ 2.5s
 *   Outro:       810-899 (3s)   → 旁白 ≤ 2.5s
 */

export interface SceneNarration {
  id: string;
  startFrame: number;
  text: string;
  /** 旁白在场景内延迟开始的帧数 */
  delayFrames: number;
}

export const narrations: SceneNarration[] = [
  {
    id: "intro",
    startFrame: 0,
    text: "ClawChat，创造你的AI朋友。",
    delayFrames: 20,
  },
  {
    id: "painpoints",
    startFrame: 90,
    text: "安装太难，维护太烦，体验太差。",
    delayFrames: 20,
  },
  {
    id: "solution",
    startFrame: 240,
    text: "创建朋友就是云端Agent，一键删除干干净净。",
    delayFrames: 10,
  },
  {
    id: "chat",
    startFrame: 360,
    text: "熟悉的聊天交互，真实的工具在运行。",
    delayFrames: 20,
  },
  {
    id: "capabilities",
    startFrame: 540,
    text: "记忆、技能、任务、状态，透明可控。",
    delayFrames: 15,
  },
  {
    id: "positioning",
    startFrame: 720,
    text: "专为AI Agent设计的原生聊天应用。",
    delayFrames: 10,
  },
  {
    id: "outro",
    startFrame: 810,
    text: "你的下一个朋友，不一定是人类。",
    delayFrames: 10,
  },
];
