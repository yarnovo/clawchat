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

const lines = [
  { cat: "宣传", verb: "说服你选" },
  { cat: "教程", verb: "教你用" },
  { cat: "科普", verb: "帮你懂" },
  { cat: "开发", verb: "带你读" },
  { cat: "技术分享", verb: "让你会" },
];

export const SceneVgDiff: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 15 - lines.length * 12, fps, config: { damping: 14 } });

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
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
            marginBottom: 16,
          }}
        >
          一句话区分
        </div>

        {lines.map((line, i) => {
          const prog = spring({
            frame: frame - 15 - i * 12,
            fps,
            config: { damping: 14, mass: 0.8 },
          });

          return (
            <div
              key={line.cat}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 20,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(prog, [0, 1], [-40, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 36,
                  fontWeight: 600,
                  color: COLORS.muted,
                  width: 160,
                  textAlign: "right",
                }}
              >
                {line.cat}
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 44,
                  fontWeight: 700,
                  color: i % 2 === 0 ? COLORS.text : COLORS.accent,
                }}
              >
                {line.verb}
              </div>
            </div>
          );
        })}

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.accent,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
            marginTop: 24,
          }}
        >
          五个视角，覆盖一切
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
