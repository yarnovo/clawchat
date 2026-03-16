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

const flowSteps = [
  { label: "Request", desc: "Authorization: Bearer <token>", highlight: false },
  { label: "Middleware", desc: "jwt({ secret, alg: 'HS256' })", highlight: true },
  { label: "Skip?", desc: '/health → next()', highlight: false },
  { label: "Verify", desc: "签名验证 + payload 解码", highlight: true },
  { label: "Inject", desc: "c.set('userId', payload.accountId)", highlight: false },
];

export const SceneSvauIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 22, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 140,
        }}
      >
        {/* Icon */}
        <div
          style={{
            transform: `scale(${iconScale})`,
            fontSize: 80,
          }}
        >
          🔐
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 76,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          JWT Auth
        </div>

        {/* Subtitle */}
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
          共享密钥，一次登录全平台通用
        </div>

        {/* Middleware flow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginTop: 16,
          }}
        >
          {flowSteps.map((step, i) => {
            const prog = spring({
              frame: frame - 30 - i * 8,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div key={step.label}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    padding: "10px 24px",
                    borderRadius: 10,
                    background: step.highlight ? "rgba(218,119,86,0.06)" : COLORS.card,
                    border: `1px solid ${step.highlight ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      fontWeight: 700,
                      color: step.highlight ? COLORS.accent : COLORS.text,
                      width: 120,
                    }}
                  >
                    {step.label}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      color: COLORS.muted,
                      whiteSpace: "pre",
                    }}
                  >
                    {step.desc}
                  </span>
                </div>
                {i < flowSteps.length - 1 && (
                  <div
                    style={{
                      textAlign: "center",
                      fontFamily: MONO,
                      fontSize: 20,
                      color: COLORS.subtle,
                      padding: "2px 0",
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    ↓
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
