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

const imports = [
  { text: "import fs from 'fs';", color: COLORS.muted },
  { text: "import { CronExpressionParser } from 'cron-parser';", color: COLORS.muted },
  { text: "import type { Channel, AgenticContext } from '@agentkit/agentic';", color: COLORS.accent },
  { text: "import { createEvent } from '@agentkit/event-loop';", color: COLORS.accent },
];

const iface = [
  "interface ScheduledTask {",
  "  name: string;",
  "  cron: string;",
  "  prompt: string;",
  "  nextRun?: Date;",
  "}",
];

export const SceneWkcsOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const importProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const ifaceProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
          channel-scheduler 走读
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          HEARTBEAT.md + cron → EventLoop
        </div>

        <div style={{ display: "flex", gap: 32, marginTop: 20 }}>
          {/* Imports card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: "22px 28px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(importProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(importProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FF5F56" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#27C93F" }} />
              <div style={{ fontFamily: MONO, fontSize: 14, color: COLORS.muted, marginLeft: 10 }}>
                imports
              </div>
            </div>
            {imports.map((line, i) => {
              const lp = spring({ frame: frame - 35 - i * 6, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    color: line.color,
                    whiteSpace: "pre",
                    lineHeight: 1.7,
                    opacity: interpolate(lp, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(lp, [0, 1], [15, 0])}px)`,
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>

          {/* Interface card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: "22px 28px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(ifaceProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(ifaceProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FF5F56" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#27C93F" }} />
              <div style={{ fontFamily: MONO, fontSize: 14, color: COLORS.muted, marginLeft: 10 }}>
                ScheduledTask
              </div>
            </div>
            {iface.map((line, i) => {
              const lp = spring({ frame: frame - 60 - i * 5, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    color: line.startsWith("  ") ? COLORS.accent : COLORS.text,
                    fontWeight: line.startsWith("interface") ? 700 : 400,
                    whiteSpace: "pre",
                    lineHeight: 1.7,
                    opacity: interpolate(lp, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(lp, [0, 1], [15, 0])}px)`,
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
