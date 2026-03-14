import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT } from "../../constants";

const painPoints = [
  {
    icon: "😫",
    title: "安装太难",
    desc: "OpenClaw 很火，但装不上",
    detail: "环境配置、依赖冲突、版本不兼容...",
  },
  {
    icon: "😤",
    title: "维护太烦",
    desc: "升级崩溃，卸载成了付费服务",
    detail: "配置文件散落各处，升级后一片狼藉",
  },
  {
    icon: "😕",
    title: "体验太差",
    desc: "通用 IM 不是为 Agent 设计的",
    detail: "工具调用看不到，记忆无法查看",
  },
];

export const ScenePainPoints: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#1a0a0a", "#2e1a1a", "#1a0a0a"]} />
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
        {/* Title with red accent */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 800,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            background: "linear-gradient(135deg, #ffffff 30%, #ff6b6b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          你遇到过这些问题吗？
        </div>

        <div style={{ display: "flex", gap: 36 }}>
          {painPoints.map((p, i) => {
            const delay = 20 + i * 20;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.8 } });
            const shake = i === 0 && frame > 30 && frame < 50
              ? Math.sin(frame * 2) * 2
              : 0;

            return (
              <div
                key={p.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  padding: "32px 28px",
                  background: "rgba(255,60,60,0.04)",
                  borderRadius: 24,
                  border: "1px solid rgba(255,80,80,0.12)",
                  width: 320,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [60, 0])}px) translateX(${shake}px)`,
                  boxShadow: "0 8px 40px rgba(255,60,60,0.08)",
                }}
              >
                <div style={{ fontSize: 52 }}>{p.icon}</div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#ff6b6b",
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 18,
                    color: "rgba(255,255,255,0.85)",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {p.desc}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.35)",
                    textAlign: "center",
                  }}
                >
                  {p.detail}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
