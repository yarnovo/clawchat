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
  { name: "AGENTS.md", desc: "Agent 配置定义" },
  { name: "SOUL.md", desc: "人格特征" },
  { name: "TOOLS.md", desc: "工具清单" },
  { name: "IDENTITY.md", desc: "身份信息" },
  { name: "MEMORY.md", desc: "长期记忆" },
];

export const SceneOvWorkspace: React.FC = () => {
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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          工作区文件
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 700 }}>
          {files.map((f, i) => {
            const delay = 12 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={f.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "18px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [50, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 220,
                    flexShrink: 0,
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
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
