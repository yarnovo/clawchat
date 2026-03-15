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

const stats = [
  { value: "46%", label: "代码由 AI 生成" },
  { value: "2000 万", label: "开发者日常使用" },
];

const tools = [
  "Claude Code", "GitHub Copilot", "Cursor", "Devin", "Xcode 26.3",
];

export const SceneAtCoding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const toolsProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          AI 编程革命
        </div>

        <div style={{ display: "flex", gap: 48 }}>
          {stats.map((s, i) => {
            const delay = 12 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.8 } });
            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${prog})`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 72, fontWeight: 700, color: COLORS.accent, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            opacity: interpolate(toolsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(toolsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {tools.map((t) => (
            <div
              key={t}
              style={{
                fontFamily: MONO,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.text,
                padding: "10px 20px",
                borderRadius: 10,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              {t}
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
          }}
        >
          开发者角色：写代码 → 监督 + 架构
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
