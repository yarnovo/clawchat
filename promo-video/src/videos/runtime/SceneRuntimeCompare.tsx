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

const comparison = [
  { dim: "定位", openclaw: "功能丰富", nanoclaw: "轻量可控", ironclaw: "极致安全" },
  { dim: "语言", openclaw: "TypeScript", nanoclaw: "TypeScript", ironclaw: "Rust" },
  { dim: "隔离", openclaw: "应用级", nanoclaw: "容器级", ironclaw: "WASM 沙箱" },
  { dim: "通道", openclaw: "50+", nanoclaw: "多通道", ironclaw: "多通道" },
  { dim: "适合", openclaw: "复杂场景", nanoclaw: "定制开发", ironclaw: "企业安全" },
];

const headers = ["维度", "OpenClaw", "NanoClaw", "IronClaw"];
const colWidths = [140, 220, 220, 220];

export const SceneRuntimeCompare: React.FC = () => {
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
          如何选择？
        </div>

        {/* Comparison table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              padding: "14px 28px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            {headers.map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: idx === 0 ? FONT_SANS : MONO,
                  fontSize: 26,
                  fontWeight: 600,
                  color: idx === 0 ? COLORS.muted : COLORS.accent,
                  letterSpacing: idx === 0 ? 2 : 0,
                  width: colWidths[idx],
                  flexShrink: 0,
                  textAlign: idx === 0 ? "left" : "center",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {comparison.map((row, i) => {
            const delay = 12 + i * 6;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            const values = [row.dim, row.openclaw, row.nanoclaw, row.ironclaw];

            return (
              <div
                key={row.dim}
                style={{
                  display: "flex",
                  padding: "12px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                {values.map((val, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontFamily: idx === 0 ? FONT_SANS : FONT_SANS,
                      fontSize: idx === 0 ? 26 : 28,
                      fontWeight: idx === 0 ? 600 : 400,
                      color: idx === 0 ? COLORS.muted : COLORS.text,
                      width: colWidths[idx],
                      flexShrink: 0,
                      textAlign: idx === 0 ? "left" : "center",
                    }}
                  >
                    {val}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
