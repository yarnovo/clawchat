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

const columns = [
  {
    name: "OpenClaw",
    arch: "Gateway",
    lang: "TypeScript",
    detail: "单进程 · 所有渠道汇聚",
    keywords: ["Agent Loop", "Channel Hub", "Plugin System"],
  },
  {
    name: "IronClaw",
    arch: "Multi-Job",
    lang: "Rust",
    detail: "单二进制 · 多 Job 并行",
    keywords: ["Job Scheduler", "WASM Sandbox", "Audit Log"],
  },
  {
    name: "NanoClaw",
    arch: "Per-Group",
    lang: "TypeScript",
    detail: "每群组一容器 · 隔离清晰",
    keywords: ["1:1 Container", "Minimal Core", "Easy Fork"],
  },
];

export const SceneRbArch: React.FC = () => {
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
          gap: 28,
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
            marginBottom: 8,
          }}
        >
          架构对比
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {columns.map((col, ci) => {
            const delay = 10 + ci * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={col.name}
                style={{
                  width: 380,
                  padding: "28px 24px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {col.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 40,
                    fontWeight: 700,
                    color: COLORS.text,
                    letterSpacing: 2,
                  }}
                >
                  {col.arch}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    textAlign: "center",
                  }}
                >
                  {col.detail}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 1,
                    background: COLORS.border,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  {col.keywords.map((kw) => (
                    <div
                      key={kw}
                      style={{
                        fontFamily: MONO,
                        fontSize: 24,
                        color: COLORS.text,
                        padding: "4px 16px",
                        borderRadius: 6,
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {kw}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
