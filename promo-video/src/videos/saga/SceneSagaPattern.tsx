import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const pairs = [
  { action: "注册账号", compensate: "删除账号" },
  { action: "建数据库记录", compensate: "删记录" },
  { action: "建好友关系", compensate: "删好友" },
  { action: "启动容器", compensate: "停止 + 删除容器" },
];

export const SceneSagaPattern: React.FC = () => {
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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          每步都有补偿
        </div>

        {/* Header row */}
        {(() => {
          const headerProg = spring({
            frame: frame - 8,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                opacity: interpolate(headerProg, [0, 1], [0, 1]),
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.muted,
                  width: 240,
                  textAlign: "center",
                }}
              >
                操作
              </div>
              <div style={{ width: 40 }} />
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.muted,
                  width: 280,
                  textAlign: "center",
                }}
              >
                补偿
              </div>
            </div>
          );
        })()}

        {/* Pairs */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {pairs.map((pair, i) => {
            const prog = spring({
              frame: frame - 16 - i * 10,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={pair.action}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                {/* Action */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    color: COLORS.text,
                    fontWeight: 600,
                    width: 240,
                    textAlign: "center",
                    padding: "12px 20px",
                    borderRadius: 10,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                  }}
                >
                  {pair.action}
                </div>

                {/* Arrow */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.accent,
                    fontWeight: 700,
                    width: 40,
                    textAlign: "center",
                  }}
                >
                  →
                </div>

                {/* Compensate */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    color: COLORS.accent,
                    fontWeight: 600,
                    width: 280,
                    textAlign: "center",
                    padding: "12px 20px",
                    borderRadius: 10,
                    background: "rgba(218,119,86,0.06)",
                    border: `1px solid ${COLORS.accent}`,
                  }}
                >
                  {pair.compensate}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
