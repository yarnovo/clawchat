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

const items = [
  { label: "callback 地址", desc: "回调 im-server" },
  { label: "gateway token", desc: "认证令牌" },
  { label: "CLAWHUB_REGISTRY", desc: "技能注册表" },
  { label: "环境变量自动注入", desc: "" },
];

export const SceneOpConfig: React.FC = () => {
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
          gap: 40,
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
          自动配置
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: 800,
          }}
        >
          {items.map((item, i) => {
            const delay = 15 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "24px 32px",
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
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {item.label}
                </div>
                {item.desc && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                    }}
                  >
                    — {item.desc}
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
