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

export const SceneOpSkills: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const descProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  const statProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          技能注册表注入
        </div>

        {/* Code block */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            padding: "28px 40px",
            borderRadius: 12,
            background: "#1A1A1A",
            color: "#FFD54F",
            fontWeight: 700,
            letterSpacing: 0.5,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [20, 0])}px)`,
          }}
        >
          CLAWHUB_REGISTRY=http://skill-registry:3007
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.text,
            opacity: interpolate(descProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(descProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Agent 启动后自动发现注册表
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.accent,
            opacity: interpolate(statProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(statProg, [0, 1], [20, 0])}px)`,
          }}
        >
          搜索和安装 25,000+ 技能
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
