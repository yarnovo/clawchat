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
  { text: "extensions/{plugin-id}/", bold: true },
  { text: "├── package.json", comment: "" },
  { text: "├── dist/index.js", comment: "" },
  { text: "└── node_modules/", comment: "" },
];

export const SceneOvExtensions: React.FC = () => {
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
          技能安装数据
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
                    fontWeight: line.bold ? 700 : 400,
                    color: line.bold ? COLORS.accent : COLORS.text,
                    whiteSpace: "pre",
                  }}
                >
                  {line.text}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            color: COLORS.muted,
            opacity: interpolate(
              spring({ frame: frame - 50, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1],
            ),
          }}
        >
          安装技能 → Volume 变大
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
