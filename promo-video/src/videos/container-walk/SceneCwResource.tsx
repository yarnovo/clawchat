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

const metrics = [
  { label: "内存", value: "256 MB" },
  { label: "CPU", value: "0.5 核" },
];

export const SceneCwResource: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 48,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          资源限制
        </div>

        <div style={{ display: "flex", gap: 60 }}>
          {metrics.map((m, i) => {
            const delay = 12 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={m.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "40px 60px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.7, 1])})`,
                }}
              >
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, letterSpacing: 2 }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 56, fontWeight: 800, color: COLORS.accent }}>
                  {m.value}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
          }}
        >
          防止单个 Agent 拖垮服务器
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
