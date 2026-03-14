import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "./GradientBg";
import { Particles } from "./Particles";
import { COLORS, FONT } from "./constants";

const solutions = [
  {
    icon: "✨",
    title: "创建朋友 = 云端 Agent",
    desc: "零安装、零配置，点一下就拥有",
  },
  {
    icon: "🗑️",
    title: "一键删除，干干净净",
    desc: "不想要了？删除好友，云端清理",
  },
  {
    icon: "💬",
    title: "原生 Agent 聊天体验",
    desc: "专为 AI Agent 设计的交互",
  },
];

export const SceneSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0a1a0a", "#1a2e1a", "#0a1a0a"]} />
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
          }}
        >
          <span
            style={{
              background: "linear-gradient(135deg, #ffffff 30%, #07C160 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ClawChat，一键搞定
          </span>
        </div>

        <div style={{ display: "flex", gap: 36 }}>
          {solutions.map((s, i) => {
            const delay = 15 + i * 15;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.8 } });
            const glow = interpolate(Math.sin(frame * 0.04 + i), [-1, 1], [0.08, 0.2]);

            return (
              <div
                key={s.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "32px 28px",
                  background: `rgba(7,193,96,0.04)`,
                  borderRadius: 24,
                  border: `1px solid rgba(7,193,96,${glow})`,
                  width: 320,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(ent, [0, 1], [0.85, 1])})`,
                  boxShadow: `0 8px 40px rgba(7,193,96,${glow * 0.5})`,
                }}
              >
                <div style={{ fontSize: 52 }}>{s.icon}</div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 18,
                    color: "rgba(255,255,255,0.7)",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
