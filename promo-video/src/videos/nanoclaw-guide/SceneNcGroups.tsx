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

const groups = [
  {
    name: "工作群",
    details: ["独立文件系统", "CLAUDE.md", "容器沙箱"],
    highlight: false,
  },
  {
    name: "家庭群",
    details: ["独立文件系统", "CLAUDE.md", "容器沙箱"],
    highlight: false,
  },
  {
    name: "主频道",
    details: ["独立文件系统", "CLAUDE.md", "管理员权限"],
    highlight: true,
  },
];

export const SceneNcGroups: React.FC = () => {
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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          群组完全隔离
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {groups.map((g, i) => {
            const delay = 12 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={g.name}
                style={{
                  width: 320,
                  padding: "28px 30px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: g.highlight
                    ? `2px solid ${COLORS.accent}`
                    : `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 600,
                    color: g.highlight ? COLORS.accent : COLORS.text,
                  }}
                >
                  {g.name}
                </div>
                {g.details.map((d) => (
                  <div
                    key={d}
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: "#F5F0EB",
                    }}
                  >
                    {d}
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
