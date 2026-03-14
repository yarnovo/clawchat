import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, MONO } from "../../constants";

const stats = [
  { label: "核心表", value: "6", color: "#a78bfa" },
  { label: "枚举类型", value: "5", color: "#60a5fa" },
  { label: "唯一约束", value: "3", color: "#34d399" },
  { label: "外键关系", value: "8", color: "#f59e0b" },
];

export const SceneDbOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const statsProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const sloganProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const glow = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.7]);

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
          paddingBottom: 120,
        }}
      >
        {/* Icon */}
        <div
          style={{
            transform: `scale(${titleProg})`,
            width: 90,
            height: 90,
            borderRadius: 24,
            background: `linear-gradient(135deg, ${COLORS.primary}, #00D2FF)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 48,
            boxShadow: `0 20px 80px rgba(108,99,255,${glow}), 0 0 120px rgba(0,210,255,${glow * 0.3})`,
          }}
        >
          🗄️
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 40,
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
                gap: 6,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 44,
                  fontWeight: 800,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 16,
                  color: "rgba(255,255,255,0.5)",
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
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.4,
              background: "linear-gradient(135deg, #ffffff 0%, #00D2FF 50%, #6C63FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: `drop-shadow(0 0 30px rgba(0,210,255,${glow * 0.3}))`,
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
