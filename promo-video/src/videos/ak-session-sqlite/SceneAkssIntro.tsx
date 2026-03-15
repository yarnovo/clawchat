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

/**
 * Scene 1: Title "SQLite Session" + timeline of message bubbles flowing into a DB icon
 */
export const SceneAkssIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* --- Title animation --- */
  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subtitleProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });

  /* --- Message bubbles staggered --- */
  const messages = [
    { role: "user" as const, text: "你好，帮我写个排序算法" },
    { role: "assistant" as const, text: "好的，这里是快速排序的实现..." },
    { role: "user" as const, text: "能换成归并排序吗？" },
    { role: "assistant" as const, text: "当然，归并排序如下..." },
    { role: "user" as const, text: "性能对比呢？" },
  ];

  const bubbleStagger = 18; // frames between each bubble

  /* --- DB icon animation --- */
  const dbProg = spring({
    frame: frame - (messages.length * bubbleStagger + 20),
    fps,
    config: { damping: 12, mass: 0.6 },
  });

  /* --- Arrow pulse --- */
  const arrowProg = spring({
    frame: frame - (messages.length * bubbleStagger + 10),
    fps,
    config: { damping: 14 },
  });
  const arrowPulse = interpolate(
    frame % 40,
    [0, 20, 40],
    [0, 6, 0],
  );

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
        {/* Title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 96,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -3,
            transform: `scale(${titleScale})`,
          }}
        >
          SQLite Session
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            letterSpacing: 1,
            opacity: interpolate(subtitleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtitleProg, [0, 1], [16, 0])}px)`,
          }}
        >
          对话记忆的持久化方案
        </div>

        {/* Timeline: bubbles -> arrow -> DB */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            marginTop: 24,
          }}
        >
          {/* Message bubbles column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              width: 460,
            }}
          >
            {messages.map((msg, i) => {
              const bubbleProg = spring({
                frame: frame - (24 + i * bubbleStagger),
                fps,
                config: { damping: 14, mass: 0.5 },
              });
              const isUser = msg.role === "user";

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    opacity: interpolate(bubbleProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(bubbleProg, [0, 1], [isUser ? 40 : -40, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      padding: "10px 20px",
                      borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isUser ? COLORS.accent : COLORS.card,
                      color: isUser ? COLORS.white : COLORS.text,
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      fontWeight: 500,
                      border: isUser ? "none" : `1px solid ${COLORS.border}`,
                      boxShadow: COLORS.cardShadow,
                      maxWidth: 360,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Arrow pointing to DB */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
            }}
          >
            <svg width="80" height="40" viewBox="0 0 80 40">
              <path
                d={`M 0 20 L ${60 + arrowPulse} 20`}
                stroke={COLORS.accent}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
              <polygon
                points={`${60 + arrowPulse},10 ${76 + arrowPulse},20 ${60 + arrowPulse},30`}
                fill={COLORS.accent}
              />
            </svg>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 14,
                color: COLORS.muted,
              }}
            >
              persist
            </div>
          </div>

          {/* Database icon */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              opacity: interpolate(dbProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(dbProg, [0, 1], [0.7, 1])})`,
            }}
          >
            <svg width="100" height="120" viewBox="0 0 100 120">
              {/* DB cylinder top ellipse */}
              <ellipse
                cx="50"
                cy="28"
                rx="44"
                ry="18"
                fill={COLORS.card}
                stroke={COLORS.border}
                strokeWidth={2}
              />
              {/* DB body */}
              <rect
                x="6"
                y="28"
                width="88"
                height="64"
                fill={COLORS.card}
                stroke="none"
              />
              <line x1="6" y1="28" x2="6" y2="92" stroke={COLORS.border} strokeWidth={2} />
              <line x1="94" y1="28" x2="94" y2="92" stroke={COLORS.border} strokeWidth={2} />
              {/* DB bottom ellipse */}
              <ellipse
                cx="50"
                cy="92"
                rx="44"
                ry="18"
                fill={COLORS.card}
                stroke={COLORS.border}
                strokeWidth={2}
              />
              {/* Middle stripe */}
              <ellipse
                cx="50"
                cy="60"
                rx="44"
                ry="12"
                fill="none"
                stroke={COLORS.border}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              {/* Label */}
              <text
                x="50"
                y="65"
                textAnchor="middle"
                fontFamily={MONO}
                fontSize="16"
                fontWeight="600"
                fill={COLORS.accent}
              >
                SQLite
              </text>
            </svg>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              session.db
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
