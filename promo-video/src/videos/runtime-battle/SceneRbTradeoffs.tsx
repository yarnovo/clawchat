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
    pros: ["渠道生态丰富", "插件系统成熟", "社区活跃"],
    cons: ["工具无沙箱隔离", "同进程风险", "镜像体积大"],
  },
  {
    name: "IronClaw",
    pros: ["WASM 沙箱", "凭证保护", "审计日志"],
    cons: ["渠道数量少", "生态不如 OpenClaw", "学习曲线陡"],
  },
  {
    name: "NanoClaw",
    pros: ["代码可读性高", "容器隔离好", "改源码容易"],
    cons: ["功能最少", "不适合复杂场景", "无插件系统"],
  },
];

export const SceneRbTradeoffs: React.FC = () => {
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
          取舍对比
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
                  gap: 12,
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

                {col.pros.map((p, pi) => {
                  const itemDelay = delay + 8 + pi * 5;
                  const itemProg = spring({
                    frame: frame - itemDelay,
                    fps,
                    config: { damping: 14 },
                  });
                  return (
                    <div
                      key={p}
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 24,
                        color: COLORS.accent,
                        padding: "6px 14px",
                        borderRadius: 8,
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        opacity: interpolate(itemProg, [0, 1], [0, 1]),
                      }}
                    >
                      + {p}
                    </div>
                  );
                })}

                <div
                  style={{
                    width: "100%",
                    height: 1,
                    background: COLORS.border,
                  }}
                />

                {col.cons.map((c, ci2) => {
                  const itemDelay = delay + 24 + ci2 * 5;
                  const itemProg = spring({
                    frame: frame - itemDelay,
                    fps,
                    config: { damping: 14 },
                  });
                  return (
                    <div
                      key={c}
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 24,
                        color: COLORS.muted,
                        padding: "6px 14px",
                        borderRadius: 8,
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        opacity: interpolate(itemProg, [0, 1], [0, 1]),
                      }}
                    >
                      - {c}
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
