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

const concepts = [
  {
    label: "LLM",
    chinese: "思考",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="20" r="12" stroke={COLORS.accent} strokeWidth="2.5" fill="none" />
        <path d="M16 32 C16 28 32 28 32 32" stroke={COLORS.accent} strokeWidth="2.5" fill="none" />
        <path d="M20 16 Q24 10 28 16" stroke={COLORS.accent} strokeWidth="2" fill="none" />
        <circle cx="20" cy="20" r="1.5" fill={COLORS.accent} />
        <circle cx="28" cy="20" r="1.5" fill={COLORS.accent} />
      </svg>
    ),
    desc: "接口定义思考能力",
  },
  {
    label: "Tool",
    chinese: "行动",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path
          d="M30 8 L40 18 L36 22 L26 12 Z"
          stroke={COLORS.accent}
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M26 12 L12 26 Q8 30 12 34 L14 36 Q18 40 22 36 L36 22"
          stroke={COLORS.accent}
          strokeWidth="2.5"
          fill="none"
        />
        <circle cx="14" cy="34" r="2" fill={COLORS.accent} />
      </svg>
    ),
    desc: "接口定义行动能力",
  },
  {
    label: "Prompt",
    chinese: "身份",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="6" width="28" height="36" rx="3" stroke={COLORS.accent} strokeWidth="2.5" fill="none" />
        <line x1="16" y1="14" x2="32" y2="14" stroke={COLORS.accent} strokeWidth="2" />
        <line x1="16" y1="20" x2="32" y2="20" stroke={COLORS.accent} strokeWidth="2" />
        <line x1="16" y1="26" x2="28" y2="26" stroke={COLORS.accent} strokeWidth="2" />
        <line x1="16" y1="32" x2="24" y2="32" stroke={COLORS.accent} strokeWidth="2" />
      </svg>
    ),
    desc: "系统提示词定义身份",
  },
  {
    label: "Session",
    chinese: "记忆",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="14" rx="14" ry="6" stroke={COLORS.accent} strokeWidth="2.5" fill="none" />
        <path d="M10 14 V34 C10 37.3 16.3 40 24 40 C31.7 40 38 37.3 38 34 V14" stroke={COLORS.accent} strokeWidth="2.5" fill="none" />
        <path d="M10 22 C10 25.3 16.3 28 24 28 C31.7 28 38 25.3 38 22" stroke={COLORS.accent} strokeWidth="2" fill="none" />
        <path d="M10 28 C10 31.3 16.3 34 24 34 C31.7 34 38 31.3 38 28" stroke={COLORS.accent} strokeWidth="2" fill="none" />
      </svg>
    ),
    desc: "管理对话历史",
  },
];

export const SceneAkcoreDesign: React.FC = () => {
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
          gap: 48,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          四个核心概念
        </div>

        {/* 2x2 grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            width: 820,
          }}
        >
          {concepts.map((c, i) => {
            const delay = 14 + i * 10;
            const cardProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={c.label}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  boxShadow: COLORS.cardShadow,
                  padding: "32px 28px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [24, 0])}px) scale(${interpolate(cardProg, [0, 1], [0.95, 1])})`,
                }}
              >
                {/* Icon area */}
                <div style={{ width: 48, height: 48 }}>{c.icon}</div>

                {/* Label */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {c.label}
                </div>

                {/* Chinese label */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.accent,
                    fontWeight: 600,
                  }}
                >
                  {c.chinese}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 18,
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

        {/* Bottom tagline */}
        {(() => {
          const tagProg = spring({
            frame: frame - 60,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                fontFamily: MONO,
                fontSize: 22,
                color: COLORS.subtle,
                letterSpacing: 2,
                opacity: interpolate(tagProg, [0, 1], [0, 1]),
              }}
            >
              zero dependencies
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
