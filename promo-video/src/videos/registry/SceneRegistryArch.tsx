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
  { method: "GET", path: "/.well-known/clawhub.json", desc: "发现协议" },
  { method: "GET", path: "/api/v1/search?q=github", desc: "搜索技能" },
  { method: "GET", path: "/api/v1/resolve?slug=github", desc: "版本解析" },
  { method: "GET", path: "/api/v1/download?slug=github", desc: "下载 ZIP" },
  { method: "GET", path: "/api/v1/skills", desc: "技能列表" },
];

export const SceneRegistryArch: React.FC = () => {
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
          gap: 32,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 56,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            API 端点
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 24,
              color: COLORS.accent,
              padding: "6px 16px",
              borderRadius: 8,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            25,425 skills indexed
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
            padding: "8px 0",
            width: 960,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              padding: "10px 28px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            {["方法", "路径", "功能"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  fontWeight: 600,
                  color: COLORS.muted,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  width: idx === 0 ? 100 : idx === 1 ? 540 : 240,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {endpoints.map((ep, i) => {
            const delay = 10 + i * 6;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={ep.path}
                style={{
                  display: "flex",
                  padding: "12px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 100,
                    flexShrink: 0,
                  }}
                >
                  {ep.method}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 21,
                    color: COLORS.text,
                    width: 540,
                    flexShrink: 0,
                  }}
                >
                  {ep.path}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    width: 240,
                    flexShrink: 0,
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
