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
    name: "入口层",
    services: [{ name: "nginx", port: "8080" }],
  },
  {
    name: "平台层",
    services: [
      { name: "mcp-server", port: "8000" },
      { name: "skill-registry", port: "3007" },
      { name: "skill-browser", port: "5173" },
    ],
  },
  {
    name: "业务层",
    services: [
      { name: "im-server", port: "3000" },
      { name: "agent-server", port: "3004" },
      { name: "container-server", port: "3002" },
      { name: "openclaw-server", port: "3003" },
      { name: "nanoclaw-server", port: "3005" },
      { name: "ironclaw-server", port: "3006" },
    ],
  },
  {
    name: "基础设施层",
    services: [
      { name: "PostgreSQL", port: "5432" },
      { name: "Redis", port: "6379" },
      { name: "Grafana", port: "3001" },
      { name: "Prometheus", port: "9090" },
      { name: "Loki + Promtail", port: "3100" },
    ],
  },
];

export const SceneDxServices: React.FC = () => {
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
          四层架构 · 16 个容器
        </div>

        {layers.map((layer, li) => {
          const delay = 8 + li * 12;
          const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
          return (
            <div
              key={layer.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                width: 1400,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {layer.services.map((s) => (
                  <div
                    key={s.name}
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      color: COLORS.text,
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span>{s.name}</span>
                    <span style={{ color: COLORS.muted, fontSize: 18 }}>:{s.port}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
