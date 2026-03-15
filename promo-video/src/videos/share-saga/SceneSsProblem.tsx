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

const rows = [
  { label: "传统事务 → 跨不了服务边界", ok: false },
  { label: "两阶段提交 → 太重太慢", ok: false },
  { label: "Saga → 轻量级替代", ok: true },
];

export const SceneSsProblem: React.FC = () => {
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
          问题
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: 800,
          }}
        >
          {rows.map((r, i) => {
            const delay = 15 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={r.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "24px 32px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${r.ok ? COLORS.accent : COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [60, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 36, flexShrink: 0 }}>
                  {r.ok ? "✅" : "❌"}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 600,
                    color: r.ok ? COLORS.accent : COLORS.text,
                  }}
                >
                  {r.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
