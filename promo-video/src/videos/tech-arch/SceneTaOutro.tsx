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

const keywords = [
  { key: "agent-core", role: "引擎", color: "#DA7756" },
  { key: "K8s", role: "调度", color: "#5B8DEF" },
  { key: "Docker", role: "载体", color: "#6BBF6A" },
  { key: "LLM", role: "大脑", color: "#9B7FCB" },
];

export const SceneTaOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const cardsProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          四层职责，各司其职
        </div>

        <div
          style={{
            display: "flex",
            gap: 28,
            opacity: interpolate(cardsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {keywords.map((kw, i) => {
            const kDelay = 20 + i * 10;
            const kProg = spring({ frame: frame - kDelay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={kw.key}
                style={{
                  width: 240,
                  padding: "32px 24px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  opacity: interpolate(kProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(kProg, [0, 1], [0.8, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 32,
                    fontWeight: 700,
                    color: kw.color,
                  }}
                >
                  {kw.key}
                </div>
                <div
                  style={{
                    width: 40,
                    height: 2,
                    background: kw.color,
                    borderRadius: 1,
                    opacity: 0.4,
                  }}
                />
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.text,
                    fontWeight: 600,
                  }}
                >
                  {kw.role}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            textAlign: "center",
            lineHeight: 1.8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
          }}
        >
          技术栈已验证可行，现在需要的是执行
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
