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
  { name: "用户界面", desc: "Web / App", color: "#5B8DEF" },
  { name: "API 网关", desc: "路由 + 认证", color: "#DA7756" },
  { name: "Agent 运行时", desc: "K8s Pod, 每 Pod 一个 Agent", color: "#6BBF6A" },
  { name: "基础设施", desc: "镜像仓库 / 数据库 / 对象存储", color: "#9B7FCB" },
];

export const SceneTaLayers: React.FC = () => {
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
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
            marginBottom: 12,
          }}
        >
          四层架构
        </div>

        {layers.map((layer, i) => {
          const delay = 10 + i * 14;
          const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
          const w = 900 - i * 40;
          return (
            <div
              key={layer.name}
              style={{
                width: w,
                padding: "24px 36px",
                borderRadius: 16,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                alignItems: "center",
                gap: 24,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 48,
                  borderRadius: 4,
                  background: layer.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {layer.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {layer.desc}
                </div>
              </div>
            </div>
          );
        })}

        {/* 连接箭头（层之间的竖线） */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 160,
            bottom: 200,
            width: 2,
            background: `linear-gradient(to bottom, transparent, ${COLORS.border}, transparent)`,
            zIndex: -1,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
