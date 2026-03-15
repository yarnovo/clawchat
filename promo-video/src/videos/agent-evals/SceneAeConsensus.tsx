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

const companies = [
  {
    name: "Anthropic",
    approach: "Eval-Driven Development",
    desc: "先写 eval 再开发",
    color: COLORS.accent,
  },
  {
    name: "OpenAI",
    approach: "Skill Test Sets",
    desc: "Codex 每个 skill 带测试集",
    color: "#5A9E6F",
  },
  {
    name: "Google",
    approach: "Golden Dataset",
    desc: "ADK 黄金数据集概念",
    color: "#7B8EC4",
  },
];

export const SceneAeConsensus: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          三大厂的共识
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "stretch" }}>
          {companies.map((c, i) => {
            const delay = 12 + i * 14;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={c.name}
                style={{
                  background: COLORS.card,
                  border: `2px solid ${c.color}`,
                  borderRadius: 18,
                  boxShadow: COLORS.cardShadow,
                  padding: "36px 44px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  minWidth: 320,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 36,
                    fontWeight: 700,
                    color: c.color,
                  }}
                >
                  {c.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                    textAlign: "center",
                  }}
                >
                  {c.approach}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    textAlign: "center",
                  }}
                >
                  {c.desc}
                </div>
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
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [16, 0])}px)`,
          }}
        >
          不只看最终回答，还要看中间步骤：工具 / 顺序 / 参数
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
