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

const flowSteps = [
  { label: "skills/*/SKILL.md", mono: true },
  { label: "扫描拼接", mono: false },
  { label: "System Prompt", mono: true },
];

export const SceneSlOurs: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const reasonProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          agent-core（我们的方案）
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.accent,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 4,
          }}
        >
          扫描 → 拼接 → System Prompt
        </div>

        {/* Flow steps */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [24, 0])}px)`,
          }}
        >
          {flowSteps.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  padding: "22px 36px",
                  borderRadius: 14,
                  background: i === flowSteps.length - 1
                    ? `linear-gradient(135deg, rgba(218, 119, 86, 0.08), rgba(218, 119, 86, 0.15))`
                    : COLORS.card,
                  border: i === flowSteps.length - 1
                    ? `2px solid ${COLORS.accent}`
                    : `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: s.mono ? MONO : FONT_SANS,
                    fontSize: 28,
                    fontWeight: 700,
                    color: i === flowSteps.length - 1 ? COLORS.accent : COLORS.text,
                  }}
                >
                  {s.label}
                </div>
              </div>
              {i < flowSteps.length - 1 && (
                <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: COLORS.subtle }}>→</div>
              )}
            </div>
          ))}
        </div>

        {/* Reason */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            marginTop: 4,
            opacity: interpolate(reasonProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(reasonProg, [0, 1], [16, 0])}px)`,
          }}
        >
          OpenAI 兼容 API — 没有独立 skill 通道
        </div>

        {/* Badge */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.card,
            background: COLORS.accent,
            padding: "12px 36px",
            borderRadius: 12,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(badgeProg, [0, 1], [0.8, 1])})`,
          }}
        >
          模型无关
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
