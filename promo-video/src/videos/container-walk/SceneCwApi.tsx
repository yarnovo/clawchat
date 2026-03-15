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

const apis = [
  { method: "POST", path: "/containers", desc: "创建容器" },
  { method: "PUT", path: "/containers/:id/start", desc: "启动容器" },
  { method: "PUT", path: "/containers/:id/stop", desc: "停止容器" },
  { method: "DELETE", path: "/containers/:id", desc: "删除容器 + Volume" },
];

export const SceneCwApi: React.FC = () => {
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
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          容器 API
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
            width: 900,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", padding: "10px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
            {["方法", "路径", "描述"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 20,
                  fontWeight: 600,
                  color: COLORS.muted,
                  letterSpacing: 2,
                  width: idx === 0 ? 140 : idx === 1 ? 420 : 300,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>
          {apis.map((api, i) => {
            const delay = 10 + i * 6;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={api.path + api.method}
                style={{
                  display: "flex",
                  padding: "14px 24px",
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: COLORS.accent, width: 140, flexShrink: 0 }}>
                  {api.method}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 21, color: COLORS.text, width: 420, flexShrink: 0 }}>
                  {api.path}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted, width: 300, flexShrink: 0 }}>
                  {api.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
