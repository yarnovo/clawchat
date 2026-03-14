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

const runtimes = [
  { name: "openclaw", desc: "默认运行时" },
  { name: "nanoclaw", desc: "轻量级引擎" },
  { name: "ironclaw", desc: "第三方运行时" },
];

const statuses = [
  { name: "created", desc: "刚创建" },
  { name: "starting", desc: "正在启动" },
  { name: "running", desc: "运行中" },
  { name: "stopped", desc: "已停止" },
  { name: "error", desc: "启动失败" },
  { name: "api_key_exhausted", desc: "余额不足" },
];

export const SceneAgentDbEnums: React.FC = () => {
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
          gap: 36,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          枚举与状态机
        </div>

        <div style={{ display: "flex", gap: 48 }}>
          {/* AgentRuntime */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {/* Enum title */}
            {(() => {
              const prog = spring({
                frame: frame - 8,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 32,
                    fontWeight: 600,
                    color: COLORS.accent,
                    marginBottom: 16,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                  }}
                >
                  AgentRuntime
                </div>
              );
            })()}

            {runtimes.map((r, i) => {
              const prog = spring({
                frame: frame - 16 - i * 8,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={r.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "10px 20px",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: COLORS.accent,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 600,
                      color: COLORS.text,
                      width: 180,
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      color: COLORS.muted,
                    }}
                  >
                    {r.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              background: COLORS.border,
              alignSelf: "stretch",
            }}
          />

          {/* AgentStatus */}
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
                    fontSize: 32,
                    fontWeight: 600,
                    color: COLORS.accent,
                    marginBottom: 16,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                  }}
                >
                  AgentStatus
                </div>
              );
            })()}

            {/* Status flow: created → starting → running */}
            {statuses.map((s, i) => {
              const prog = spring({
                frame: frame - 20 - i * 6,
                fps,
                config: { damping: 14, mass: 0.6 },
              });

              const isActive = s.name === "running";

              return (
                <div
                  key={s.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "8px 20px",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  }}
                >
                  {/* Arrow connector */}
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: COLORS.subtle,
                      width: 24,
                      textAlign: "center",
                    }}
                  >
                    {i > 0 ? "↓" : ""}
                  </div>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 600,
                      color: isActive ? COLORS.accent : COLORS.text,
                      width: 240,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                    }}
                  >
                    {s.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
