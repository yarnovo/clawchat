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
  { method: "GET", path: "/v1/agents/market", desc: "浏览列表", params: "?page=1&size=20&sort=downloads" },
  { method: "GET", path: "/v1/agents/market/search", desc: "全文搜索", params: "?q=legal&category=tool" },
  { method: "GET", path: "/v1/agents/market/:id", desc: "详情", params: "" },
  { method: "POST", path: "/v1/agents/market/publish", desc: "上架", params: "{ agentId }" },
  { method: "DELETE", path: "/v1/agents/market/:id", desc: "下架", params: "" },
];

const sortOptions = ["downloads", "rating", "newest"];

export const SceneSvmBrowse: React.FC = () => {
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
          gap: 36,
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
          API Endpoints
        </div>

        {/* Sort badges */}
        <div style={{ display: "flex", gap: 16 }}>
          {sortOptions.map((s, i) => {
            const delay = 10 + i * 6;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14 } });
            return (
              <div
                key={s}
                style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  fontWeight: 600,
                  color: COLORS.accent,
                  padding: "8px 24px",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.card,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  whiteSpace: "pre" as const,
                }}
              >
                sort={s}
              </div>
            );
          })}
        </div>

        {/* Endpoint list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1300 }}>
          {endpoints.map((ep, i) => {
            const delay = 18 + i * 8;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            const methodColor = ep.method === "GET" ? "#2E7D32" : ep.method === "POST" ? "#1565C0" : "#C62828";
            return (
              <div
                key={ep.path + ep.method}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "16px 28px",
                  background: COLORS.card,
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 700,
                    color: methodColor,
                    minWidth: 80,
                    whiteSpace: "pre" as const,
                  }}
                >
                  {ep.method}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.text,
                    minWidth: 420,
                    whiteSpace: "pre" as const,
                  }}
                >
                  {ep.path}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                    minWidth: 100,
                  }}
                >
                  {ep.desc}
                </div>
                {ep.params && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      color: COLORS.subtle,
                      whiteSpace: "pre" as const,
                    }}
                  >
                    {ep.params}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
