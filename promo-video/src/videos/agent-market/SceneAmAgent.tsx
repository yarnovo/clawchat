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

const layers = [
  { key: "文件系统", value: "记忆", icon: "📁" },
  { key: "工具", value: "能力", icon: "🔧" },
  { key: "CLAUDE.md", value: "人格", icon: "🧠" },
];

export const SceneAmAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const skillProg = spring({ frame: frame - 50, fps, config: { damping: 12 } });
  const bootProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });

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

        {/* Docker 示意 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            width: 700,
            borderRadius: 16,
            overflow: "hidden",
            border: `2px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
          }}
        >
          {/* Docker 标题栏 */}
          <div
            style={{
              background: COLORS.text,
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 20, color: COLORS.white, fontWeight: 600 }}>
              🐳 Docker Container
            </div>
          </div>

          {/* 内容层 */}
          {layers.map((l, i) => {
            const delay = 10 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={l.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px 28px",
                  background: i % 2 === 0 ? COLORS.card : COLORS.bg,
                  borderBottom: i < layers.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 32 }}>{l.icon}</div>
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: COLORS.text, width: 240 }}>
                  {l.key}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.accent, fontWeight: 600 }}>
                  = {l.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* 自己安装技能 */}
        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "center",
            opacity: interpolate(skillProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(skillProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 26,
              color: COLORS.muted,
            }}
          >
            自己安装技能
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 24,
              color: COLORS.accent,
              fontWeight: 700,
              padding: "8px 20px",
              borderRadius: 10,
              background: COLORS.card,
              border: `1px solid ${COLORS.accent}40`,
            }}
          >
            越用越强
          </div>
        </div>

        {/* 3秒启动 */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.accent,
            opacity: interpolate(bootProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(bootProg, [0, 1], [0.8, 1])})`,
          }}
        >
          3 秒启动
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
