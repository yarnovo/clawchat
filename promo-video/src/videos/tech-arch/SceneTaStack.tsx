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

const stack = [
  { role: "前端", tech: "Flutter", note: "跨平台" },
  { role: "网关", tech: "Hono + TS", note: "轻量高性能" },
  { role: "引擎", tech: "agent-core", note: "agentkit" },
  { role: "编排", tech: "K8s", note: "Pod 调度" },
  { role: "镜像", tech: "Harbor", note: "私有仓库" },
  { role: "数据库", tech: "PostgreSQL", note: "关系型" },
  { role: "消息队列", tech: "Redis", note: "Pub/Sub" },
];

export const SceneTaStack: React.FC = () => {
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
            marginBottom: 8,
          }}
        >
          技术选型
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 900 }}>
          {stack.map((s, i) => {
            const delay = 8 + i * 7;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={s.role}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.accent,
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {s.role}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.text,
                    width: 280,
                    flexShrink: 0,
                  }}
                >
                  {s.tech}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {s.note}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            color: COLORS.accent,
            marginTop: 8,
            opacity: interpolate(
              spring({ frame: frame - 65, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1],
            ),
          }}
        >
          TypeScript + Docker
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
