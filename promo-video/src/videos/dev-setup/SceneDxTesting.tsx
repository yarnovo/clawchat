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

const levels = [
  {
    level: "L1",
    name: "单元 / Widget",
    tool: "Flutter test + mock HTTP",
    desc: "跑得快，每次 push 触发",
    width: 350,
  },
  {
    level: "L2",
    name: "API 端到端",
    tool: "vitest + 真实数据库",
    desc: "app.request() 直连测试库",
    width: 550,
  },
  {
    level: "L3",
    name: "全链路集成",
    tool: "Playwright + 真实服务",
    desc: "注册 → 登录 → 加好友 → 发消息",
    width: 780,
  },
];

export const SceneDxTesting: React.FC = () => {
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
          测试三层金字塔
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column-reverse",
            alignItems: "center",
            gap: 16,
          }}
        >
          {levels.map((l, i) => {
            const delay = 12 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={l.level}
                style={{
                  width: l.width,
                  padding: "22px 32px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  alignItems: "center",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 32,
                      fontWeight: 700,
                      color: COLORS.accent,
                    }}
                  >
                    {l.level}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    {l.name}
                  </span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 22, color: COLORS.muted }}>
                  {l.tool}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {l.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
