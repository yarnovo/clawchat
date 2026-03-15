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
  { name: "message", icon: "Msg", desc: "发消息给用户，保持沟通" },
  { name: "task_create", icon: "T+", desc: "创建子任务，拆解复杂工作" },
  { name: "task_status", icon: "T?", desc: "查看任务进度，管理工作流" },
];

export const SceneCtSocial: React.FC = () => {
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
          <span style={{ color: "#7C5CBF" }}>第三层</span> · 协作
        </div>

        <div style={{ display: "flex", gap: 32, justifyContent: "center" }}>
          {tools.map((tool, i) => {
            const delay = 10 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });
            return (
              <div
                key={tool.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "36px 40px",
                  borderRadius: 20,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  width: 260,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.7, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 32,
                    fontWeight: 700,
                    color: "#7C5CBF",
                    width: 72,
                    height: 72,
                    borderRadius: 16,
                    background: "#7C5CBF12",
                    border: "1px solid #7C5CBF30",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {tool.icon}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {tool.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {tool.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
