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

const sections = [
  { num: "1", title: "Agent Identity", source: "AGENT.md", isSkill: false },
  { num: "2", title: "Available Tools", source: "TOOLS.md", isSkill: false },
  { num: "3", title: "Memory", source: "MEMORY.md", isSkill: false },
  { num: "4", title: "Skills", source: "skills/*/SKILL.md", isSkill: true },
  { num: "5", title: "Scheduled Tasks", source: "HEARTBEAT.md", isSkill: false },
];

export const SceneSlStructure: React.FC = () => {
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
          gap: 20,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            marginBottom: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          System Prompt 完整结构
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            width: 800,
          }}
        >
          {sections.map((sec, i) => {
            const delay = 12 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const isFirst = i === 0;
            const isLast = i === sections.length - 1;
            return (
              <div
                key={sec.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "20px 28px",
                  background: sec.isSkill
                    ? `linear-gradient(135deg, rgba(218, 119, 86, 0.06), rgba(218, 119, 86, 0.14))`
                    : COLORS.card,
                  border: sec.isSkill
                    ? `2px solid ${COLORS.accent}`
                    : `1px solid ${COLORS.border}`,
                  borderBottom: !isLast ? "none" : undefined,
                  borderRadius: isFirst
                    ? "14px 14px 0 0"
                    : isLast
                      ? "0 0 14px 14px"
                      : 0,
                  gap: 20,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-24, 0])}px)`,
                }}
              >
                {/* Number badge */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: sec.isSkill ? COLORS.card : COLORS.accent,
                    background: sec.isSkill ? COLORS.accent : "rgba(218, 119, 86, 0.1)",
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {sec.num}
                </div>

                {/* Title */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: sec.isSkill ? COLORS.accent : COLORS.text,
                    flex: 1,
                  }}
                >
                  {sec.title}
                </div>

                {/* Source */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: sec.isSkill ? COLORS.accent : COLORS.muted,
                    fontWeight: sec.isSkill ? 600 : 400,
                  }}
                >
                  {sec.source}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        {(() => {
          const noteProg = spring({ frame: frame - 70, fps, config: { damping: 14 } });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                color: COLORS.muted,
                marginTop: 16,
                padding: "8px 24px",
                borderRadius: 8,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                opacity: interpolate(noteProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(noteProg, [0, 1], [16, 0])}px)`,
              }}
            >
              五个区域 · 加载顺序固定 · 一次拼接
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
