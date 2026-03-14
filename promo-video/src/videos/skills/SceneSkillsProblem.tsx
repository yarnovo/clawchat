import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { FONT } from "../../constants";

const agents = [
  { name: "法律顾问", prompt: "你是一个法律顾问..." },
  { name: "翻译助手", prompt: "你是一个翻译助手..." },
  { name: "写作帮手", prompt: "你是一个写作帮手..." },
  { name: "代码专家", prompt: "你是一个代码专家..." },
];

export const SceneSkillsProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#1a0a0a", "#2e1a1a", "#1a0a0a"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 50,
          paddingBottom: 120,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 800,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            background: "linear-gradient(135deg, #ffffff 30%, #ff6b6b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          换个提示词 ≠ 新 Agent
        </div>

        {/* Agent cards — all look the same */}
        <div style={{ display: "flex", gap: 24 }}>
          {agents.map((a, i) => {
            const delay = 20 + i * 15;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });

            // Subtle "sameness" visual — all cards identical structure
            return (
              <div
                key={a.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  padding: "28px 24px",
                  background: "rgba(255,60,60,0.03)",
                  borderRadius: 20,
                  border: "1px solid rgba(255,80,80,0.1)",
                  width: 260,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [50, 0])}px)`,
                }}
              >
                {/* Same robot icon for all */}
                <div style={{ fontSize: 44 }}>🤖</div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#ff8a8a",
                  }}
                >
                  {a.name}
                </div>
                {/* System prompt preview — all start the same */}
                <div
                  style={{
                    fontFamily: "JetBrains Mono, SF Mono, monospace",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.3)",
                    textAlign: "center",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 8,
                    width: "100%",
                  }}
                >
                  {a.prompt}
                </div>
                {/* Empty skills area */}
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.2)",
                    padding: "6px 12px",
                    border: "1px dashed rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  暂无技能
                </div>
              </div>
            );
          })}
        </div>

        {/* "equals" sign animation */}
        {frame > 80 && (
          <div
            style={{
              fontFamily: FONT,
              fontSize: 20,
              color: "rgba(255,100,100,0.6)",
              opacity: interpolate(frame, [80, 100], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            能力完全一样，只是名字不同
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
