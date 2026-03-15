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

const files = [
  { name: "AGENTS.md", openclaw: true, ironclaw: true, nanoclaw: true },
  { name: "SOUL.md", openclaw: true, ironclaw: true, nanoclaw: true },
  { name: "IDENTITY.md", openclaw: false, ironclaw: true, nanoclaw: false },
  { name: "HEARTBEAT.md", openclaw: false, ironclaw: true, nanoclaw: false },
];

const runtimes = ["OpenClaw", "IronClaw", "NanoClaw"] as const;

export const SceneSmIdentity: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const headerProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          身份文件 · 共同基础
        </div>

        {/* Comparison table */}
        <div
          style={{
            borderRadius: 16,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
            opacity: interpolate(headerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(headerProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${COLORS.border}`,
              background: "#F5F0EB",
            }}
          >
            <div
              style={{
                width: 240,
                padding: "18px 28px",
                fontFamily: FONT_SANS,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              文件
            </div>
            {runtimes.map((r) => (
              <div
                key={r}
                style={{
                  width: 200,
                  padding: "18px 20px",
                  fontFamily: MONO,
                  fontSize: 24,
                  fontWeight: 600,
                  color: COLORS.accent,
                  textAlign: "center",
                }}
              >
                {r}
              </div>
            ))}
          </div>

          {/* Rows */}
          {files.map((f, fi) => {
            const rowDelay = 20 + fi * 10;
            const rowProg = spring({ frame: frame - rowDelay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={f.name}
                style={{
                  display: "flex",
                  borderBottom: fi < files.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                }}
              >
                <div
                  style={{
                    width: 240,
                    padding: "16px 28px",
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.text,
                  }}
                >
                  {f.name}
                </div>
                {[f.openclaw, f.ironclaw, f.nanoclaw].map((supported, ci) => (
                  <div
                    key={ci}
                    style={{
                      width: 200,
                      padding: "16px 20px",
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      textAlign: "center",
                      color: supported ? COLORS.accent : COLORS.subtle,
                    }}
                  >
                    {supported ? "\u2713" : "\u2014"}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* HEARTBEAT explanation */}
        {(() => {
          const noteProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                color: COLORS.muted,
                textAlign: "center",
                lineHeight: 1.6,
                opacity: interpolate(noteProg, [0, 1], [0, 1]),
              }}
            >
              HEARTBEAT.md = 定时触发的后台任务（如定期整理记忆）
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
