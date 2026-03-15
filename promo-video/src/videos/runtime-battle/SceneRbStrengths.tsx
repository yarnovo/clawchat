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

const columns = [
  {
    name: "OpenClaw",
    strengths: [
      "Telegram 开箱即用",
      "Discord 开箱即用",
      "Slack 开箱即用",
      "25+ 内置渠道",
      "插件生态丰富",
    ],
  },
  {
    name: "IronClaw",
    strengths: [
      "WASM 沙箱隔离",
      "凭证加密存储",
      "泄露检测",
      "审计日志",
      "企业级安全模型",
    ],
  },
  {
    name: "NanoClaw",
    strengths: [
      "代码可读性最好",
      "核心逻辑极少",
      "想定制直接改源码",
      "学习成本最低",
      "容器隔离清晰",
    ],
  },
];

export const SceneRbStrengths: React.FC = () => {
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
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            marginBottom: 8,
          }}
        >
          各自强项
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {columns.map((col, ci) => {
            const delay = 10 + ci * 12;
            const colProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={col.name}
                style={{
                  width: 380,
                  padding: "24px 20px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  opacity: interpolate(colProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(colProg, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.accent,
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  {col.name}
                </div>
                {col.strengths.map((s, si) => {
                  const itemDelay = delay + 8 + si * 6;
                  const itemProg = spring({
                    frame: frame - itemDelay,
                    fps,
                    config: { damping: 14 },
                  });
                  return (
                    <div
                      key={s}
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 24,
                        color: COLORS.text,
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        opacity: interpolate(itemProg, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(itemProg, [0, 1], [20, 0])}px)`,
                      }}
                    >
                      {s}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
