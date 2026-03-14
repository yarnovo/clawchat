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

const changes = [
  { file: "docker-compose.yml", desc: "新增 skill-registry-server 服务，端口 3007" },
  { file: "nginx/default.conf", desc: "添加 /.well-known/ 和 /api/v1/ 路由" },
  { file: "Makefile", desc: "新增 logs-skill-registry / restart-skill-registry" },
  { file: "CLAUDE.md", desc: "更新架构图和 API 路由表" },
];

export const SceneDevInfra: React.FC = () => {
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
          基础设施改动
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 900 }}>
          {changes.map((c, i) => {
            const delay = 12 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={c.file}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "18px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [50, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: COLORS.accent, width: 300, flexShrink: 0 }}>
                  {c.file}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted }}>
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
