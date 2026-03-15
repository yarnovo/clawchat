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
    name: "Built-in",
    label: "编译入二进制",
    items: ["核心工具", "高性能", "零延迟"],
  },
  {
    name: "MCP",
    label: "协议对接外部",
    items: ["标准协议", "外部服务", "网络隔离"],
  },
  {
    name: "WASM",
    label: "沙箱加载",
    items: ["不受信任工具", "独立沙箱", "安全执行"],
  },
];

const wasmFeatures = [
  { label: "燃料计量", desc: "限制执行步数" },
  { label: "内存限制", desc: "独立内存上限" },
  { label: "白名单", desc: "endpoint 访问控制" },
];

export const SceneTeIronclaw: React.FC = () => {
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
          gap: 20,
          paddingBottom: 140,
          paddingTop: 30,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            marginBottom: 4,
          }}
        >
          IronClaw · 安全路线
        </div>

        {layers.map((layer, li) => {
          const delay = 8 + li * 12;
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
                  width: 140,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {layer.name}
              </div>
              <div
                style={{
                  width: 2,
                  height: 50,
                  background: COLORS.border,
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {layer.items.map((item) => (
                  <div
                    key={item}
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      color: COLORS.text,
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* WASM sandbox features */}
        <div
          style={{
            display: "flex",
            gap: 28,
            marginTop: 16,
          }}
        >
          {wasmFeatures.map((f, fi) => {
            const delay = 48 + fi * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={f.label}
                style={{
                  padding: "18px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {f.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
