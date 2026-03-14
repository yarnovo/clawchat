import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "./GradientBg";
import { Particles } from "./Particles";
import { FONT } from "./constants";

const capabilities = [
  {
    icon: "🧠",
    title: "记忆",
    desc: "Agent 记住了什么？\n随时查看、随时管理",
    color: "#a78bfa",
  },
  {
    icon: "🔧",
    title: "MCP 技能",
    desc: "已安装的工具和服务\n一目了然",
    color: "#60a5fa",
  },
  {
    icon: "⏰",
    title: "定时任务",
    desc: "Agent 在忙什么？\n计划任务全掌控",
    color: "#f59e0b",
  },
  {
    icon: "📊",
    title: "实时状态",
    desc: "工具调用、运行日志\n透明可追溯",
    color: "#34d399",
  },
];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export const SceneCapabilities: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0c0a2e", "#1e1a4e", "#0c0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 50,
          paddingBottom: 120,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 800,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            background: "linear-gradient(135deg, #ffffff 20%, #a78bfa 60%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          透明可控的 AI 伙伴
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center", maxWidth: 1400 }}>
          {capabilities.map((c, i) => {
            const delay = 20 + i * 18;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            const dir = i % 2 === 0 ? -1 : 1;
            const rgb = hexToRgb(c.color);
            const glow = interpolate(Math.sin(frame * 0.04 + i * 1.5), [-1, 1], [0.05, 0.15]);

            return (
              <div
                key={c.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  padding: "32px 28px",
                  background: `rgba(${rgb},0.04)`,
                  borderRadius: 24,
                  border: `1px solid rgba(${rgb},${glow + 0.1})`,
                  width: 290,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [60 * dir, 0])}px) translateY(${interpolate(ent, [0, 1], [40, 0])}px)`,
                  boxShadow: `0 8px 40px rgba(${rgb},${glow})`,
                }}
              >
                <div style={{ fontSize: 48 }}>{c.icon}</div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 26,
                    fontWeight: 700,
                    color: c.color,
                  }}
                >
                  {c.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 16,
                    color: "rgba(255,255,255,0.6)",
                    textAlign: "center",
                    lineHeight: 1.6,
                    whiteSpace: "pre-line",
                  }}
                >
                  {c.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
