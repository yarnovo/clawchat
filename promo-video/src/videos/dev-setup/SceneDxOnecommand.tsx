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

const logLines = [
  { text: "$ make dev", color: COLORS.accent },
  { text: "docker compose up -d --build", color: COLORS.muted },
  { text: " Container clawchat-postgres      Running", color: COLORS.text },
  { text: " Container clawchat-redis          Running", color: COLORS.text },
  { text: " Container clawchat-im-server      Started", color: COLORS.text },
  { text: " Container clawchat-agent-server   Started", color: COLORS.text },
  { text: " Container clawchat-nginx          Started", color: COLORS.text },
  { text: " Container clawchat-grafana        Running", color: COLORS.text },
  { text: "", color: COLORS.text },
  { text: "Web UI: http://localhost:8080", color: COLORS.accent },
];

export const SceneDxOnecommand: React.FC = () => {
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
          gap: 32,
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
          一条命令，全栈启动
        </div>

        <div
          style={{
            width: 960,
            padding: "28px 36px",
            borderRadius: 16,
            background: "#1E1E1E",
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {logLines.map((line, i) => {
            const delay = 10 + i * 5;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: line.color === COLORS.text ? "#D4D4D4" :
                         line.color === COLORS.accent ? "#DA7756" : "#808080",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  minHeight: line.text ? undefined : 12,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
