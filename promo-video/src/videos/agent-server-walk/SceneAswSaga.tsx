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

const steps = [
  { step: "\u2460", action: "\u6CE8\u518C IM \u8D26\u53F7", compensate: "\u5220\u9664\u8D26\u53F7" },
  { step: "\u2461", action: "\u5EFA DB \u8BB0\u5F55", compensate: "\u5220\u8BB0\u5F55" },
  { step: "\u2462", action: "\u6DFB\u52A0\u597D\u53CB", compensate: "\u5220\u597D\u53CB" },
  { step: "\u2463", action: "\u542F\u52A8\u5BB9\u5668", compensate: "\u505C\u6B62\u5BB9\u5668" },
];

export const SceneAswSaga: React.FC = () => {
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
          gap: 36,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
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
          Saga 创建流程
        </div>

        {/* Table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: "8px 0",
            width: 900,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              padding: "10px 28px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            {["步骤", "操作", "补偿"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  fontWeight: 600,
                  color: COLORS.muted,
                  letterSpacing: 2,
                  width: idx === 0 ? 120 : idx === 1 ? 400 : 380,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {steps.map((s, i) => {
            const delay = 12 + i * 8;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={s.step}
                style={{
                  display: "flex",
                  padding: "14px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {s.step}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.text,
                    width: 400,
                    flexShrink: 0,
                  }}
                >
                  {s.action}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.muted,
                    width: 380,
                    flexShrink: 0,
                  }}
                >
                  ↩ {s.compensate}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
