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
  { method: "GET", path: "/api/agents", desc: "列出所有 Agent" },
  { method: "POST", path: "/api/agents", desc: "创建新 Agent" },
  { method: "GET", path: "/api/agents/:id", desc: "获取单个详情" },
  { method: "DELETE", path: "/api/agents/:id", desc: "软删除 Agent" },
  { method: "POST", path: "/api/agents/:id/start", desc: "启动容器" },
  { method: "POST", path: "/api/agents/:id/stop", desc: "停止容器" },
];

const methodColor: Record<string, string> = {
  GET: "#22863a",
  POST: COLORS.accent,
  DELETE: "#cb2431",
};

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Agents API
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: interpolate(frame, [10, 25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
          }}
        >
          6 个端点，覆盖完整生命周期
        </div>

        {/* Endpoint cards */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            justifyContent: "center",
            maxWidth: 1300,
          }}
        >
          {endpoints.map((ep, i) => {
            const delay = 18 + i * 8;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={`${ep.method}-${ep.path}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 24px",
                  background: COLORS.card,
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [20, 0])}px)`,
                  minWidth: 380,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 700,
                    color: methodColor[ep.method] || COLORS.text,
                    minWidth: 70,
                    whiteSpace: "pre",
                  }}
                >
                  {ep.method}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.text,
                    minWidth: 240,
                    whiteSpace: "pre",
                  }}
                >
                  {ep.path}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
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
