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

const modes = [
  { name: "Direct", desc: "直接聊天" },
  { name: "Group", desc: "群组隔离" },
  { name: "Queue", desc: "队列模式" },
  { name: "Reply", desc: "回复模式" },
];

export const SceneSmOpenclaw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const modesProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const pruneProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
          OpenClaw · 内存会话
        </div>

        {/* 4 modes */}
        <div
          style={{
            display: "flex",
            gap: 20,
            opacity: interpolate(modesProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(modesProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {modes.map((m) => (
            <div
              key={m.name}
              style={{
                width: 240,
                padding: "24px 20px",
                borderRadius: 14,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
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
                {m.name}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  color: COLORS.muted,
                }}
              >
                {m.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Pruning mechanism */}
        <div
          style={{
            padding: "24px 48px",
            borderRadius: 14,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            display: "flex",
            alignItems: "center",
            gap: 32,
            opacity: interpolate(pruneProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(pruneProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            自动剪枝
          </div>
          <div
            style={{
              width: 2,
              height: 40,
              background: COLORS.border,
            }}
          />
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 26,
              color: COLORS.muted,
            }}
          >
            超期 / 超大小时自动清理
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            textAlign: "center",
            lineHeight: 1.6,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
          }}
        >
          快速但易失 · 可扩展接入 LanceDB 等外部存储
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
