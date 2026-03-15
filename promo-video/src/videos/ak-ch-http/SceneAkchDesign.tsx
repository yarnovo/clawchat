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

const endpoints = [
  {
    method: "POST",
    path: "/api/chat",
    desc: "发送消息",
    methodColor: "#22C55E",
  },
  {
    method: "GET",
    path: "/api/events",
    desc: "SSE 实时推送",
    methodColor: "#3B82F6",
  },
  {
    method: "GET",
    path: "/api/info",
    desc: "Agent 状态",
    methodColor: "#3B82F6",
  },
];

export const SceneAkchDesign: React.FC = () => {
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
          三个端点，简单直接
        </div>

        {/* Endpoint cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: 720,
          }}
        >
          {endpoints.map((ep, i) => {
            const delay = 15 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={ep.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "24px 32px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-40, 0])}px)`,
                }}
              >
                {/* Method badge */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    fontWeight: 700,
                    color: COLORS.white,
                    background: ep.methodColor,
                    padding: "6px 14px",
                    borderRadius: 8,
                    minWidth: 70,
                    textAlign: "center",
                  }}
                >
                  {ep.method}
                </div>

                {/* Path */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                    flex: 1,
                  }}
                >
                  {ep.path}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                    fontWeight: 500,
                  }}
                >
                  {ep.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
