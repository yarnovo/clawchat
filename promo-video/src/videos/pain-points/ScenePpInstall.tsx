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

const techs = [
  "Docker 安装与配置",
  "Node.js 环境搭建",
  "Python 依赖管理",
  "端口映射 + 网络设置",
  "配置文件编辑",
  "环境变量设置",
];

export const ScenePpInstall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const footProg = spring({
    frame: frame - 20 - techs.length * 8,
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
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div
            style={{
              position: "absolute",
              top: -12,
              left: -80,
              fontFamily: FONT_SANS,
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.card,
              background: "#E53E3E",
              padding: "4px 16px",
              borderRadius: 8,
              opacity: interpolate(labelProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(labelProg, [0, 1], [0.5, 1])})`,
            }}
          >
            痛点 1
          </div>
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
            安装太难
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {techs.map((tech, i) => {
            const delay = 18 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={tech}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 500,
                  color: COLORS.text,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-30, 0])}px)`,
                }}
              >
                <span style={{ color: "#E53E3E", fontSize: 24 }}>
                  {"\u274C"}
                </span>
                {tech}
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
          装不上是常态
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
