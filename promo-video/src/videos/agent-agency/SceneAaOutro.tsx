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

const keywords = [
  "不卖代码卖服务",
  "不做项目做订阅",
  "不靠人力靠模板",
];

export const SceneAaOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const footerProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          {keywords.map((kw, i) => {
            const delay = i * 14;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.8 } });
            return (
              <div
                key={kw}
                style={{
                  fontFamily: FONT,
                  fontSize: 56,
                  fontWeight: 700,
                  color: COLORS.text,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                {kw}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.accent,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
          }}
        >
          一个人 + Claude Code + NanoClaw = Agent 外包公司
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
