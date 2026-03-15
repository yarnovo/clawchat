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

const events = [
  {
    type: "agent.thinking",
    desc: "Agent 正在处理，用户看到思考状态",
  },
  {
    type: "agent.done",
    desc: "回复完成，消息立即显示",
  },
];

export const SceneWsAgent: React.FC = () => {
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
          gap: 40,
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
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Agent 状态推送
        </div>

        {/* Event cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            width: 860,
          }}
        >
          {events.map((e, i) => {
            const delay = 15 + i * 16;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={e.type}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: "28px 36px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.9, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {e.type}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.text,
                    lineHeight: 1.5,
                  }}
                >
                  {e.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        {(() => {
          const noteProg = spring({
            frame: frame - 55,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                color: COLORS.muted,
                opacity: interpolate(noteProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(noteProg, [0, 1], [20, 0])}px)`,
                marginTop: 8,
              }}
            >
              体验更自然，不会消息凭空出现
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
