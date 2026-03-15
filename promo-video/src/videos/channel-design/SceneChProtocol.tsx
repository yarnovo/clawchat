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

const protocols = [
  {
    name: "WebSocket",
    direction: "双向",
    latency: "极低",
    streaming: "原生支持",
    complexity: "中等",
    highlight: true,
  },
  {
    name: "SSE",
    direction: "单向 (S→C)",
    latency: "低",
    streaming: "原生支持",
    complexity: "简单",
    highlight: true,
  },
  {
    name: "HTTP Polling",
    direction: "单向",
    latency: "高",
    streaming: "不支持",
    complexity: "最简单",
    highlight: false,
  },
];

const headers = ["协议", "方向", "延迟", "流式", "复杂度"];
const colWidths = [180, 160, 100, 140, 120];

export const SceneChProtocol: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const tableProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const resultProg = spring({ frame: frame - 70, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
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
          通信协议对比
        </div>

        {/* Table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
            opacity: interpolate(tableProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tableProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {/* Header */}
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
                  fontFamily: idx === 0 ? MONO : FONT_SANS,
                  fontSize: 24,
                  fontWeight: 600,
                  color: idx === 0 ? COLORS.accent : COLORS.muted,
                  width: colWidths[idx],
                  flexShrink: 0,
                  textAlign: idx === 0 ? "left" : "center",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {protocols.map((row, i) => {
            const delay = 20 + i * 10;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const values = [row.name, row.direction, row.latency, row.streaming, row.complexity];
            return (
              <div
                key={row.name}
                style={{
                  display: "flex",
                  padding: "14px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: row.highlight
                    ? "rgba(218,119,86,0.05)"
                    : i % 2 === 0
                      ? "transparent"
                      : "rgba(0,0,0,0.015)",
                  borderLeft: row.highlight ? `3px solid ${COLORS.accent}` : "3px solid transparent",
                }}
              >
                {values.map((val, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontFamily: idx === 0 ? MONO : FONT_SANS,
                      fontSize: idx === 0 ? 26 : 24,
                      fontWeight: idx === 0 ? 600 : 400,
                      color: idx === 0 ? COLORS.text : COLORS.text,
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

        {/* Result */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.accent,
            fontWeight: 600,
            opacity: interpolate(resultProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(resultProg, [0, 1], [15, 0])}px)`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontFamily: MONO }}>WebSocket + SSE</span>
          <span style={{ color: COLORS.muted, fontWeight: 400 }}>混合方案</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
