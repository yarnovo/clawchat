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
  { name: "id", type: "uuid", note: "PK, defaultRandom" },
  { name: "ownerId", type: "uuid", note: "创建者" },
  { name: "name", type: "text", note: "Agent 名称" },
  { name: "status", type: "agent_status", note: "枚举状态" },
  { name: "config", type: "jsonb", note: "灵活配置" },
  { name: "channelUrl", type: "text", note: "容器通信地址" },
  { name: "containerName", type: "text", note: "Docker 容器名" },
  { name: "deletedAt", type: "timestamp?", note: "软删除标记" },
];

const statuses = ["created", "starting", "running", "stopped", "error", "deleted"];

export const SceneSvdbAgents: React.FC = () => {
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
        {/* Title */}
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
          agents 表详情
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* Left: Column list */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {columns.map((col, i) => {
              const prog = spring({
                frame: frame - 8 - i * 4,
                fps,
                config: { damping: 14, mass: 0.6 },
              });

              const isKey = col.name === "status" || col.name === "config" || col.name === "deletedAt";

              return (
                <div
                  key={col.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "6px 16px",
                    borderRadius: 8,
                    background: isKey ? "rgba(218,119,86,0.05)" : "transparent",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      fontWeight: 600,
                      color: isKey ? COLORS.accent : COLORS.text,
                      width: 170,
                      whiteSpace: "pre",
                    }}
                  >
                    {col.name}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      color: COLORS.subtle,
                      width: 130,
                      whiteSpace: "pre",
                    }}
                  >
                    {col.type}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: COLORS.muted,
                    }}
                  >
                    {col.note}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Status enum */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {(() => {
              const prog = spring({
                frame: frame - 12,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.accent,
                    marginBottom: 12,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                  }}
                >
                  agent_status
                </div>
              );
            })()}

            {statuses.map((s, i) => {
              const prog = spring({
                frame: frame - 18 - i * 5,
                fps,
                config: { damping: 14, mass: 0.6 },
              });

              const isActive = s === "running";
              const isError = s === "error" || s === "deleted";

              return (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "6px 16px",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      color: COLORS.subtle,
                      width: 20,
                      textAlign: "center",
                    }}
                  >
                    {i > 0 ? "↓" : ""}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      fontWeight: 600,
                      color: isActive ? COLORS.accent : isError ? COLORS.muted : COLORS.text,
                      padding: "4px 14px",
                      borderRadius: 6,
                      background: isActive ? "rgba(218,119,86,0.08)" : "transparent",
                      border: isActive ? `1px solid ${COLORS.accent}` : "1px solid transparent",
                      whiteSpace: "pre",
                    }}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
