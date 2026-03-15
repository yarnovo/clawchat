import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, MONO } from "../../constants";

const treeLines = [
  { text: "~/.openclaw/", indent: 0, comment: "" },
  { text: "├── openclaw.json", indent: 0, comment: "# 主配置" },
  { text: "├── credentials/", indent: 0, comment: "# OAuth 凭证" },
  { text: "├── agents/", indent: 0, comment: "# Agent 实例数据" },
  { text: "├── extensions/", indent: 0, comment: "# 技能插件" },
  { text: "└── workspace/", indent: 0, comment: "# 工作区文件" },
];

export const SceneOvOverview: React.FC = () => {
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
          目录总览
        </div>

        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: "32px 48px",
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {treeLines.map((line, i) => {
            const delay = 10 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: i === 0 ? 700 : 400,
                    color: i === 0 ? COLORS.accent : COLORS.text,
                    whiteSpace: "pre",
                  }}
                >
                  {line.text}
                </div>
                {line.comment && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      color: COLORS.muted,
                    }}
                  >
                    {line.comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
