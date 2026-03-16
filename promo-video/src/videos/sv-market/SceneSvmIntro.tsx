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

const cards = [
  { icon: "\uD83D\uDD0D", label: "Browse", desc: "浏览公开 Agent" },
  { icon: "\uD83D\uDD0E", label: "Search", desc: "关键词搜索" },
  { icon: "\uD83D\uDD00", label: "Fork", desc: "一键复制运行" },
  { icon: "\uD83D\uDCE4", label: "Publish", desc: "上架到市场" },
];

export const SceneSvmIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 48,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 84,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Agent Market
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Agent 市场的后端路由
        </div>

        {/* 4 marketplace cards */}
        <div style={{ display: "flex", gap: 32 }}>
          {cards.map((c, i) => {
            const delay = 22 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });
            return (
              <div
                key={c.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 20,
                  padding: "32px 40px",
                  minWidth: 230,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 48 }}>{c.icon}</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {c.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {c.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
