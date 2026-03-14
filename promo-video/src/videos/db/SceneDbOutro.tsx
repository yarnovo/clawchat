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
  { label: "核心表", value: "6", color: COLORS.text },
  { label: "枚举类型", value: "5", color: COLORS.muted },
  { label: "唯一约束", value: "3", color: COLORS.accent },
  { label: "外键关系", value: "8", color: COLORS.accent },
];

export const SceneDbOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const statsProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const sloganProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        {/* Icon */}
        <div
          style={{
            transform: `scale(${titleProg})`,
            fontSize: 80,
          }}
        >
          🗄️
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            opacity: interpolate(statsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(statsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "20px 32px",
                background: COLORS.card,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 48,
                  fontWeight: 800,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  color: COLORS.muted,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Slogan */}
        <div
          style={{
            opacity: interpolate(sloganProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(sloganProg, [0, 1], [20, 0])}px)`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.4,
              color: COLORS.text,
            }}
          >
            简洁的表设计
            <br />
            无限的可能性
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
