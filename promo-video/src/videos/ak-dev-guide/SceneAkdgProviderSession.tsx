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

const interfaceLines = [
  "interface ChatSession {",
  "  getMessages(): ChatMessage[];",
  "  addMessage(msg: ChatMessage): void;",
  "  clear(): void;",
  "}",
];

const implementations = [
  {
    name: "SQLiteSession",
    desc: "持久化",
    color: COLORS.accent,
  },
  {
    name: "RedisSession",
    desc: "分布式",
    color: COLORS.muted,
  },
];

/**
 * Scene 3: Session Provider interface + two implementation cards side by side
 */
export const SceneAkdgProviderSession: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* --- Title --- */
  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({
    frame: frame - 12,
    fps,
    config: { damping: 14 },
  });

  /* --- Interface card --- */
  const cardProg = spring({
    frame: frame - 22,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
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
          扩展点 2: Session Provider
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            letterSpacing: 2,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [12, 0])}px)`,
          }}
        >
          实现 ChatSession 接口
        </div>

        {/* Interface definition card */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            boxShadow: COLORS.cardShadow,
            padding: "28px 36px",
            opacity: interpolate(cardProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {interfaceLines.map((line, i) => {
            const lineProg = spring({
              frame: frame - (28 + i * 8),
              fps,
              config: { damping: 14, mass: 0.5 },
            });

            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 26,
                  fontWeight: 500,
                  color: COLORS.text,
                  lineHeight: 1.7,
                  whiteSpace: "pre",
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [30, 0])}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        {/* Two implementation cards side by side */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 8,
          }}
        >
          {implementations.map((impl, i) => {
            const implProg = spring({
              frame: frame - (28 + interfaceLines.length * 8 + 8 + i * 12),
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={impl.name}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 14,
                  boxShadow: COLORS.cardShadow,
                  padding: "24px 36px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 280,
                  opacity: interpolate(implProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(implProg, [0, 1], [24, 0])}px) scale(${interpolate(implProg, [0, 1], [0.92, 1])})`,
                }}
              >
                {/* Implementation name */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    color: impl.color,
                  }}
                >
                  {impl.name}
                </div>

                {/* Description tag */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.subtle,
                    fontWeight: 500,
                  }}
                >
                  {impl.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
