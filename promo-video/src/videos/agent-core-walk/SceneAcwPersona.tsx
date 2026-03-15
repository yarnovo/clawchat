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

const personaFiles = [
  { name: "AGENT.md", desc: "人格和规则", protected: true },
  { name: "TOOLS.md", desc: "描述工具", protected: false },
  { name: "MEMORY.md", desc: "长期记忆（可读写）", protected: false },
  { name: "HEARTBEAT.md", desc: "定时任务", protected: false },
];

export const SceneAcwPersona: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const arrowProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          persona.ts · 人格加载
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 8,
          }}
        >
          从文件系统读取四个文件
        </div>

        {/* Four file cards in a row */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
          {personaFiles.map((f, i) => {
            const delay = 18 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={f.name}
                style={{
                  padding: "28px 32px",
                  borderRadius: 14,
                  background: f.protected
                    ? `linear-gradient(135deg, ${COLORS.card}, rgba(218, 119, 86, 0.06))`
                    : COLORS.card,
                  border: f.protected
                    ? `2px solid ${COLORS.accent}`
                    : `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 220,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  position: "relative" as const,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: f.protected ? COLORS.accent : COLORS.text,
                  }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {f.desc}
                </div>
                {f.protected && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      right: -12,
                      fontFamily: FONT_SANS,
                      fontSize: 18,
                      fontWeight: 600,
                      color: COLORS.card,
                      background: COLORS.accent,
                      padding: "4px 12px",
                      borderRadius: 8,
                    }}
                  >
                    受保护
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Arrow to system prompt */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 12,
            opacity: interpolate(arrowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(arrowProg, [0, 1], [16, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 32,
              color: COLORS.subtle,
            }}
          >
            ↓ 拼接注入
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.accent,
              padding: "12px 28px",
              borderRadius: 12,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            system prompt
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
