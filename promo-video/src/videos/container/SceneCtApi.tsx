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
  { method: "POST", path: "/containers/:id/start", desc: "启动" },
  { method: "POST", path: "/containers/:id/stop", desc: "停止" },
  { method: "DELETE", path: "/containers/:id", desc: "删除" },
  { method: "POST", path: "/volumes", desc: "创建 Volume" },
];

export const SceneCtApi: React.FC = () => {
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
          API 端点
        </div>

        {/* Table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: "8px 0",
            width: 900,
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
            {["方法", "路径", "说明"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  fontWeight: 600,
                  color: COLORS.muted,
                  letterSpacing: 2,
                  width: idx === 0 ? 120 : idx === 1 ? 460 : 220,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {apis.map((api, i) => {
            const delay = 12 + i * 6;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={api.path + api.method}
                style={{
                  display: "flex",
                  padding: "10px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    color: api.method === "DELETE" ? "#c0392b" : COLORS.accent,
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {api.method}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.text,
                    width: 460,
                    flexShrink: 0,
                  }}
                >
                  {api.path}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.muted,
                    width: 220,
                    flexShrink: 0,
                  }}
                >
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
