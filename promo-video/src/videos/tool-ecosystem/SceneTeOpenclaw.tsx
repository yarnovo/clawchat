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

const layers = [
  {
    name: "Bundled",
    label: "核心内置",
    items: ["文件读写", "Shell 执行", "HTTP 请求"],
  },
  {
    name: "ClawHub",
    label: "注册表分发",
    items: ["第三方技能", "npm 包管理", "LLM 自动选择"],
  },
  {
    name: "Workspace",
    label: "本地自定义",
    items: ["用户脚本", "项目级工具", "提示词绑定"],
  },
];

export const SceneTeOpenclaw: React.FC = () => {
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
          gap: 24,
          paddingBottom: 140,
          paddingTop: 40,
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
          OpenClaw · 生态路线
        </div>

        {layers.map((layer, li) => {
          const delay = 10 + li * 14;
          const prog = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, mass: 0.6 },
          });
          return (
            <div
              key={layer.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                width: 1200,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.accent,
                  width: 160,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {layer.name}
              </div>
              <div
                style={{
                  width: 2,
                  height: 60,
                  background: COLORS.border,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  padding: "20px 28px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {layer.label}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {layer.items.map((item) => (
                    <div
                      key={item}
                      style={{
                        fontFamily: MONO,
                        fontSize: 22,
                        color: COLORS.muted,
                        padding: "6px 14px",
                        borderRadius: 8,
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
            marginTop: 8,
            opacity: interpolate(
              spring({
                frame: frame - 56,
                fps,
                config: { damping: 14 },
              }),
              [0, 1],
              [0, 1]
            ),
          }}
        >
          生态最丰富 -- 工具与 Agent 同进程
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
