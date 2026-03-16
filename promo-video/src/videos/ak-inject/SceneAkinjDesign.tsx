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

const TIMELINE_Y = 420;
const TIMELINE_LEFT = 200;
const TIMELINE_RIGHT = 1720;

const steps = [
  { label: "tool results", sublabel: "上一轮写完", x: 360, color: "#5B8DEF" },
  { label: "drainInbox()", sublabel: "排空 inbox", x: 720, color: COLORS.accent },
  { label: "user 消息", sublabel: "注入 session", x: 1060, color: "#6DC5A1" },
  { label: "LLM.chat()", sublabel: "模型看到新指令", x: 1400, color: "#9B7DD4" },
];

export const SceneAkinjDesign: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const lineProg = spring({ frame: frame - 15, fps, config: { damping: 16, mass: 1.2 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ paddingBottom: 140 }}>
        {/* Title */}
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 52,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            时序保证
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            position: "absolute",
            top: 235,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              color: COLORS.muted,
            }}
          >
            每轮循环开头 drain，消息顺序合法
          </div>
        </div>

        {/* Timeline line */}
        <div
          style={{
            position: "absolute",
            left: TIMELINE_LEFT,
            top: TIMELINE_Y,
            width: interpolate(lineProg, [0, 1], [0, TIMELINE_RIGHT - TIMELINE_LEFT]),
            height: 3,
            background: `linear-gradient(90deg, ${COLORS.subtle}, ${COLORS.accent}, ${COLORS.subtle})`,
            borderRadius: 2,
          }}
        />

        {/* Arrow at end */}
        <div
          style={{
            position: "absolute",
            left: TIMELINE_RIGHT - 10,
            top: TIMELINE_Y - 8,
            width: 0,
            height: 0,
            borderTop: "10px solid transparent",
            borderBottom: "10px solid transparent",
            borderLeft: `14px solid ${COLORS.accent}`,
            opacity: interpolate(lineProg, [0, 1], [0, 0.7]),
          }}
        />

        {/* Step nodes */}
        {steps.map((step, i) => {
          const stepProg = spring({
            frame: frame - 25 - i * 15,
            fps,
            config: { damping: 14, mass: 0.7 },
          });

          return (
            <div key={i}>
              {/* Node circle */}
              <div
                style={{
                  position: "absolute",
                  left: step.x - 14,
                  top: TIMELINE_Y - 14,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: step.color,
                  boxShadow: `0 0 16px ${step.color}40`,
                  opacity: interpolate(stepProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(stepProg, [0, 1], [0.3, 1])})`,
                }}
              />

              {/* Label above */}
              <div
                style={{
                  position: "absolute",
                  left: step.x - 80,
                  top: TIMELINE_Y - 80,
                  width: 160,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  opacity: interpolate(stepProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(stepProg, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    fontWeight: 700,
                    color: step.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </div>
              </div>

              {/* Sublabel below */}
              <div
                style={{
                  position: "absolute",
                  left: step.x - 80,
                  top: TIMELINE_Y + 30,
                  width: 160,
                  display: "flex",
                  justifyContent: "center",
                  opacity: interpolate(stepProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(stepProg, [0, 1], [-10, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.sublabel}
                </div>
              </div>
            </div>
          );
        })}

        {/* Inbox queue visualization */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 560,
            display: "flex",
            justifyContent: "center",
            gap: 40,
            opacity: interpolate(
              spring({ frame: frame - 70, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1]
            ),
          }}
        >
          {/* Inbox box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 28px",
              borderRadius: 14,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              inbox[]
            </span>
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                color: COLORS.muted,
              }}
            >
              →
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 22,
                fontWeight: 700,
                color: "#6DC5A1",
              }}
            >
              session
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
