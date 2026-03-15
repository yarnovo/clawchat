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

const layers = ["会话记忆 · JSONL", "工作空间 · Markdown", "向量索引 · SQLite"];

export const SceneMemIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });

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
        <div style={{ transform: `scale(${iconScale})`, fontSize: 90 }}>🧠</div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          OpenClaw 记忆系统
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          三层架构 · 备份与迁移
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 8,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          {layers.map((l) => (
            <div
              key={l}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                color: COLORS.accent,
                padding: "8px 18px",
                borderRadius: 8,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {l}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
