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

const solutions = [
  "创建 Agent \u2192 像添加好友",
  "一键启动 \u2192 十秒上线",
  "一键删除 \u2192 干干净净",
  "Docker / 容器 / Volume \u2192 云端管理",
];

export const ScenePpSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footProg = spring({
    frame: frame - 20 - solutions.length * 10,
    fps,
    config: { damping: 14 },
  });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          ClawChat 的答案
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {solutions.map((item, i) => {
            const delay = 15 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontFamily: FONT_SANS,
                  fontSize: 30,
                  fontWeight: 600,
                  color: COLORS.text,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-30, 0])}px)`,
                }}
              >
                <span style={{ fontSize: 26, color: "#38A169" }}>
                  {"\u2705"}
                </span>
                {item}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 36,
            fontWeight: 700,
            color: COLORS.accent,
            marginTop: 16,
            opacity: interpolate(footProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(footProg, [0, 1], [0.8, 1])})`,
          }}
        >
          你只需要聊天
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
