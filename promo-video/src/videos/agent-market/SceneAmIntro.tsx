import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

export const SceneAmIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

  const phases = [
    { label: "服务", desc: "第一阶段" },
    { label: "平台", desc: "第二阶段" },
  ];

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
            fontFamily: FONT,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            transform: `scale(${titleProg})`,
          }}
        >
          Agent 市场路线图
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 36,
            color: COLORS.muted,
            letterSpacing: 6,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          先卖铲子，再开金矿
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 12,
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {phases.map((p, i) => (
            <div
              key={p.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                fontFamily: FONT_SANS,
                padding: "14px 36px",
                borderRadius: 12,
                background: COLORS.card,
                border: `1px solid ${i === 0 ? COLORS.accent : COLORS.border}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              <div style={{ fontSize: 18, color: COLORS.muted }}>{p.desc}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: i === 0 ? COLORS.accent : COLORS.text }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
