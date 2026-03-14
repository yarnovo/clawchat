import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { FONT, MONO } from "../../constants";

export const SceneDbIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  const glow = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.7]);

  const tags = ["PostgreSQL", "Prisma ORM", "6 Core Tables"];

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0a0a2e", "#1a1a4e", "#0a0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 120,
        }}
      >
        {/* Database icon */}
        <div
          style={{
            transform: `scale(${iconScale})`,
            width: 120,
            height: 120,
            borderRadius: 32,
            background: "linear-gradient(135deg, #6C63FF, #00D2FF)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 64,
            boxShadow: `0 20px 80px rgba(108,99,255,${glow}), 0 0 120px rgba(0,210,255,${glow * 0.3})`,
          }}
        >
          🗄️
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
            background: "linear-gradient(135deg, #ffffff 0%, #00D2FF 50%, #6C63FF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          数据库架构设计
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 28,
            fontWeight: 300,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: 6,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          统一 · 简洁 · 可扩展
        </div>

        {/* Tech tags */}
        <div
          style={{
            display: "flex",
            gap: 16,
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [20, 0])}px)`,
            marginTop: 12,
          }}
        >
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: "#00D2FF",
                padding: "8px 20px",
                borderRadius: 10,
                background: "rgba(0,210,255,0.06)",
                border: `1px solid rgba(0,210,255,${interpolate(Math.sin(frame * 0.05), [-1, 1], [0.15, 0.35])})`,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
