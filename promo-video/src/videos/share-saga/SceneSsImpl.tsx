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

const codeLines = [
  "interface Step {",
  "  execute:    () => Promise<void>",
  "  compensate: () => Promise<void>",
  "}",
  "",
  "async function saga(steps: Step[]) {",
  "  // 顺序执行，失败逆序补偿",
  "  // 整个框架 < 100 行",
  "}",
];

export const SceneSsImpl: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          实现
        </div>

        <div
          style={{
            background: "rgba(26, 26, 26, 0.04)",
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            padding: "32px 40px",
            width: 780,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {codeLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: line.startsWith("//") || line.startsWith("  //")
                  ? COLORS.muted
                  : COLORS.text,
                lineHeight: 1.8,
                whiteSpace: "pre",
                minHeight: line === "" ? 12 : undefined,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
