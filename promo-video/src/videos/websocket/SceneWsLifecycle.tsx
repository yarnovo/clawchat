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

const steps = [
  { num: "①", label: "建立 WebSocket 连接" },
  { num: "②", label: "发送 auth + JWT" },
  { num: "③", label: "服务端验证 → auth.ok" },
  { num: "④", label: "正常收发消息" },
];

export const SceneWsLifecycle: React.FC = () => {
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
          连接生命周期
        </div>

        {/* Steps */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: 800,
          }}
        >
          {steps.map((s, i) => {
            const delay = 15 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={s.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "22px 32px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [60, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 36,
                    fontWeight: 800,
                    color: COLORS.accent,
                    width: 48,
                    textAlign: "center",
                  }}
                >
                  {s.num}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        {(() => {
          const noteProg = spring({
            frame: frame - 70,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: COLORS.muted,
                opacity: interpolate(noteProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(noteProg, [0, 1], [20, 0])}px)`,
                marginTop: 8,
              }}
            >
              断线自动重连（指数退避）
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
