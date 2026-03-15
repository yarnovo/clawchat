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

const types = [
  { type: "message.send", dir: "→", desc: "发送消息" },
  { type: "message.new", dir: "←", desc: "接收新消息" },
  { type: "message.deleted", dir: "←", desc: "消息撤回" },
  { type: "typing", dir: "←", desc: "对方正在输入" },
  { type: "agent.thinking", dir: "←", desc: "Agent 思考中" },
  { type: "presence.online", dir: "←", desc: "好友上线" },
];

export const SceneWsMessages: React.FC = () => {
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
          消息类型
        </div>

        {/* Table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: 900,
          }}
        >
          {/* Header */}
          {(() => {
            const headerProg = spring({
              frame: frame - 10,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 28px",
                  opacity: interpolate(headerProg, [0, 1], [0, 0.6]),
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    color: COLORS.muted,
                    width: 360,
                  }}
                >
                  Type
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                    width: 80,
                    textAlign: "center",
                  }}
                >
                  方向
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                    flex: 1,
                  }}
                >
                  说明
                </div>
              </div>
            );
          })()}

          {/* Rows */}
          {types.map((t, i) => {
            const delay = 15 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={t.type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.accent,
                    fontWeight: 600,
                    width: 360,
                  }}
                >
                  {t.type}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.muted,
                    width: 80,
                    textAlign: "center",
                  }}
                >
                  {t.dir}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.text,
                    flex: 1,
                  }}
                >
                  {t.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
