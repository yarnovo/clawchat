import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const containerParts = [
  { icon: "📁", label: "文件系统", desc: "记忆", color: COLORS.accent },
  { icon: "🔧", label: "装的工具", desc: "能力", color: COLORS.muted },
  { icon: "📝", label: "CLAUDE.md", desc: "人格", color: COLORS.accent },
];

export const SceneAmChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const containerProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.6 } });
  const destroyProg = spring({ frame: frame - 55, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          容器就是 Agent
        </div>

        {/* 容器示意图 */}
        <div
          style={{
            width: 800,
            padding: "32px 36px",
            borderRadius: 18,
            background: COLORS.card,
            border: `2px solid ${COLORS.accent}`,
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            opacity: interpolate(containerProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(containerProg, [0, 1], [0.9, 1])})`,
          }}
        >
          {/* 容器头部 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderBottom: `1px solid ${COLORS.border}`,
              paddingBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 22,
                color: COLORS.card,
                background: COLORS.accent,
                padding: "4px 14px",
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              Docker Container
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
              = Agent 本体
            </div>
          </div>

          {/* 三个组成部分 */}
          <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
            {containerParts.map((p, i) => {
              const delay = 20 + i * 10;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <div
                  key={p.label}
                  style={{
                    flex: 1,
                    padding: "20px 16px",
                    borderRadius: 12,
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 36 }}>{p.icon}</div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600, color: COLORS.text }}>
                    {p.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      fontWeight: 700,
                      color: p.color,
                      padding: "4px 14px",
                      borderRadius: 6,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    = {p.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 聊完即走 */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 600,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(destroyProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(destroyProg, [0, 1], [15, 0])}px)`,
          }}
        >
          聊完即走，容器销毁
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
