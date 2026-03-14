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

const endpoints = [
  { handler: "GET /search", params: "?q=&limit=", ret: "{ results: [...] }" },
  { handler: "GET /resolve", params: "?slug=&hash=", ret: "{ match, latestVersion }" },
  { handler: "GET /download", params: "?slug=&version=", ret: "ZIP binary" },
  { handler: "GET /skills", params: "?limit=&cursor=&sort=", ret: "{ items, nextCursor }" },
  { handler: "GET /skills/:slug", params: "", ret: "{ skill, latestVersion, owner, moderation }" },
];

export const SceneDevApi: React.FC = () => {
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
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 48, fontWeight: 700, color: COLORS.accent }}>
            api-v1.ts
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted }}>
            ClawHub 兼容端点
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            width: 1050,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", padding: "10px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
            {["端点", "参数", "返回"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 20,
                  fontWeight: 600,
                  color: COLORS.muted,
                  letterSpacing: 2,
                  width: idx === 0 ? 260 : idx === 1 ? 320 : 400,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>
          {endpoints.map((ep, i) => {
            const delay = 10 + i * 6;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={ep.handler}
                style={{
                  display: "flex",
                  padding: "11px 24px",
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: COLORS.text, width: 260, flexShrink: 0 }}>
                  {ep.handler}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 19, color: COLORS.muted, width: 320, flexShrink: 0 }}>
                  {ep.params}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 19, color: COLORS.accent, width: 400, flexShrink: 0 }}>
                  {ep.ret}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
