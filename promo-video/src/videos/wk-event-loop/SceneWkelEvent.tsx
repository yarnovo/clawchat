import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT_SANS, MONO } from "../../constants";

const AGENT_EVENT_CODE = `interface AgentEvent {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  priority?: number;   // smaller = higher
  timestamp: Date;
}`;

const CREATE_EVENT_CODE = `function createEvent(
  type: string,
  source: string,
  payload: Record<string, unknown>,
  priority?: number,
): AgentEvent {
  return { id: randomUUID(), type, source,
           payload, priority, timestamp: new Date() };
}`;

export const SceneWkelEvent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 15, fps, config: { damping: 14, mass: 0.8 } });
  const rightProg = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.8 } });
  const arrowProg = spring({ frame: frame - 50, fps, config: { damping: 12 } });

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
            fontFamily: FONT_SANS,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          AgentEvent + createEvent
        </div>

        {/* Two code blocks side by side */}
        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* AgentEvent interface */}
          <div
            style={{
              padding: "24px 28px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 20,
                lineHeight: 1.6,
                color: COLORS.text,
                whiteSpace: "pre",
              }}
            >
              {AGENT_EVENT_CODE.split("\n").map((line, i) => {
                const isField = line.includes(":") && !line.includes("interface");
                const isPriority = line.includes("priority");
                return (
                  <div key={i}>
                    <span style={{ color: isPriority ? COLORS.accent : isField ? "#5B8DEF" : COLORS.text }}>
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "center",
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
            }}
          >
            <div
              style={{
                width: 40,
                height: 3,
                background: COLORS.subtle,
              }}
            />
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                borderLeft: `12px solid ${COLORS.accent}`,
              }}
            />
          </div>

          {/* createEvent function */}
          <div
            style={{
              padding: "24px 28px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 20,
                lineHeight: 1.6,
                color: COLORS.text,
                whiteSpace: "pre",
              }}
            >
              {CREATE_EVENT_CODE.split("\n").map((line, i) => {
                const isReturn = line.trimStart().startsWith("return");
                const isFnName = line.includes("createEvent");
                return (
                  <div key={i}>
                    <span style={{ color: isFnName ? COLORS.accent : isReturn ? "#6DC5A1" : COLORS.text }}>
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hint */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 22,
            color: COLORS.muted,
            opacity: interpolate(arrowProg, [0, 1], [0, 1]),
          }}
        >
          randomUUID + new Date() -- one-line factory
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
