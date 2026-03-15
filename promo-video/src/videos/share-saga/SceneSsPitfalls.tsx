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

const pitfalls = [
  { num: "①", text: "补偿必须幂等 — 可能重试" },
  { num: "②", text: "补偿失败记日志不阻塞" },
  { num: "③", text: "补偿严格逆序执行" },
];

export const SceneSsPitfalls: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          实战踩坑
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: 800,
          }}
        >
          {pitfalls.map((p, i) => {
            const delay = 15 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={p.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "24px 32px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [60, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 32, flexShrink: 0 }}>⚠️</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {p.num} {p.text}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
