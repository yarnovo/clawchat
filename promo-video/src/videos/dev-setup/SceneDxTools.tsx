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

const tools = [
  { cmd: "make logs-im", desc: "查看 im-server 实时日志" },
  { cmd: "make restart-agent", desc: "重启 agent-server" },
  { cmd: "make db-studio", desc: "打开 Prisma 数据库 GUI" },
  { cmd: "make diagnose", desc: "一键诊断整个环境" },
  { cmd: "make db-backup", desc: "备份数据库" },
  { cmd: "make e2e-test", desc: "运行 E2E 测试" },
];

export const SceneDxTools: React.FC = () => {
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
          Makefile 快捷指令
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 880 }}>
          {tools.map((t, i) => {
            const delay = 10 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={t.cmd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "16px 28px",
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
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.accent,
                    width: 380,
                    flexShrink: 0,
                  }}
                >
                  {t.cmd}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted }}>
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
