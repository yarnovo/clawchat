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

const flows = [
  { label: "注册", steps: ["bcrypt 哈希密码", "存入 Account 表"] },
  { label: "登录", steps: ["验证密码", "签发 JWT"] },
  { label: "请求", steps: ["中间件解析 Token", "注入 userId"] },
];

export const SceneImwAuth: React.FC = () => {
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
          认证模块
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: 900,
          }}
        >
          {flows.map((flow, i) => {
            const delay = 12 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={flow.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [50, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.card,
                    background: COLORS.accent,
                    padding: "10px 22px",
                    borderRadius: 10,
                    flexShrink: 0,
                    width: 100,
                    textAlign: "center",
                  }}
                >
                  {flow.label}
                </div>
                {flow.steps.map((step, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 28,
                        color: COLORS.muted,
                      }}
                    >
                      →
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 22,
                        color: COLORS.text,
                        padding: "10px 20px",
                        borderRadius: 10,
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: COLORS.cardShadow,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
