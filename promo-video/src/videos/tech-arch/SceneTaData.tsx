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
  { label: "用户", icon: "User" },
  { label: "WebSocket", icon: "WS" },
  { label: "网关", icon: "GW" },
  { label: "Pod", icon: "K8s" },
  { label: "LLM API", icon: "AI" },
];

const storages = [
  { name: "PostgreSQL", desc: "聊天记录" },
  { name: "Registry", desc: "镜像存储" },
];

export const SceneTaData: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const storageProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          数据流
        </div>

        {/* 水平数据流 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {flowSteps.map((step, i) => {
            const sDelay = 16 + i * 10;
            const sProg = spring({ frame: frame - sDelay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: 160,
                    padding: "20px 12px",
                    borderRadius: 14,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    opacity: interpolate(sProg, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(sProg, [0, 1], [0.8, 1])})`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.accent,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.text,
                      fontWeight: 600,
                    }}
                  >
                    {step.label}
                  </div>
                </div>
                {i < flowSteps.length - 1 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      color: COLORS.accent,
                      margin: "0 8px",
                      opacity: interpolate(sProg, [0, 1], [0, 1]),
                    }}
                  >
                    {"\u2192"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 存储层 */}
        <div
          style={{
            display: "flex",
            gap: 32,
            opacity: interpolate(storageProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(storageProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {storages.map((s) => (
            <div
              key={s.name}
              style={{
                padding: "20px 36px",
                borderRadius: 14,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.text }}>
                {s.name}
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
