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

const layers = [
  { label: "Base Instructions", desc: "基础指令", highlight: false },
  { label: "Tool Definitions", desc: "工具定义", highlight: false },
  { label: "# Project Context", desc: "人格文件内容", highlight: true },
];

const files = ["AGENTS.md", "SOUL.md", "IDENTITY.md", "USER.md", "..."];

export const SceneLsWhere: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const layerBaseProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const filesProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 8,
          }}
        >
          System Prompt 结构
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            width: 700,
          }}
        >
          {layers.map((l, i) => {
            const delay = 14 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={l.label}
                style={{
                  padding: "20px 32px",
                  background: l.highlight
                    ? `linear-gradient(135deg, rgba(218, 119, 86, 0.08), rgba(218, 119, 86, 0.15))`
                    : COLORS.card,
                  border: l.highlight
                    ? `2px solid ${COLORS.accent}`
                    : `1px solid ${COLORS.border}`,
                  borderBottom: i < layers.length - 1 ? "none" : undefined,
                  borderRadius: i === 0 ? "14px 14px 0 0" : i === layers.length - 1 ? "0 0 14px 14px" : 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: l.highlight ? COLORS.accent : COLORS.text,
                  }}
                >
                  {l.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {l.desc}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 12,
            opacity: interpolate(filesProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(filesProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {files.map((f) => (
            <div
              key={f}
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: COLORS.muted,
                padding: "8px 18px",
                borderRadius: 8,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {f}
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.accent,
            marginTop: 4,
            padding: "8px 24px",
            borderRadius: 8,
            background: "rgba(218, 119, 86, 0.08)",
            border: `1px solid rgba(218, 119, 86, 0.2)`,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [16, 0])}px)`,
          }}
        >
          系统级 -- 每次 API 调用都带上
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
