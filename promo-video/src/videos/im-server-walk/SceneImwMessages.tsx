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
  { method: "POST", path: "/messages", desc: "发送消息" },
  { method: "GET", path: "/messages?before=&limit=", desc: "游标分页拉取" },
  { method: "DELETE", path: "/messages/:id", desc: "软删除（撤回）" },
];

export const SceneImwMessages: React.FC = () => {
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
          消息模块
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
            width: 950,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "12px 24px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            {["方法", "端点", "说明"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 20,
                  fontWeight: 600,
                  color: COLORS.muted,
                  letterSpacing: 2,
                  width: idx === 0 ? 120 : idx === 1 ? 480 : 300,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>
          {apis.map((api, i) => {
            const delay = 10 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={api.path}
                style={{
                  display: "flex",
                  padding: "14px 24px",
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {api.method}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 21,
                    color: COLORS.text,
                    width: 480,
                    flexShrink: 0,
                  }}
                >
                  {api.path}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                    width: 300,
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
