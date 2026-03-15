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
  { name: "AGENT.md", desc: "人格和行为规则", protected: true },
  { name: "TOOLS.md", desc: "已安装工具", protected: false },
  { name: "MEMORY.md", desc: "长期记忆", protected: false },
  { name: "HEARTBEAT.md", desc: "定时任务", protected: false },
];

export const ScenePdAgentcore: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
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
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          agent-core
        </div>

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
          四文件 · 模型无关
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
          }}
        >
          {files.map((f, i) => {
            const delay = 18 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={f.name}
                style={{
                  padding: "28px 36px",
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
                  minWidth: 230,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 30,
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

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            marginTop: 8,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [16, 0])}px)`,
          }}
        >
          Agent 可修改 MEMORY.md，不可修改 AGENT.md
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
