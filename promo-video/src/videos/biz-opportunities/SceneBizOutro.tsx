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

const dimensions = [
  { label: "信任", color: COLORS.accent },
  { label: "效率", color: COLORS.text },
  { label: "生态", color: COLORS.accent },
  { label: "陪伴", color: COLORS.text },
  { label: "品味", color: COLORS.accent },
  { label: "恐惧", color: COLORS.text },
];

export const SceneBizOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const ringProg = spring({ frame: frame - 10, fps, config: { damping: 14, mass: 0.8 } });
  const sloganProg = spring({ frame: frame - 30, fps, config: { damping: 12, mass: 0.8 } });
  const footerProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

  const ringRadius = 180;

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
        {/* 环形维度分布 */}
        <div
          style={{
            position: "relative",
            width: ringRadius * 2 + 160,
            height: ringRadius * 2 + 160,
            opacity: interpolate(ringProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(ringProg, [0, 1], [0.6, 1])})`,
          }}
        >
          {/* 中心大字 */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontFamily: FONT,
              fontSize: 32,
              fontWeight: 700,
              color: COLORS.text,
              textAlign: "center",
              lineHeight: 1.5,
              width: 240,
              opacity: interpolate(titleProg, [0, 1], [0, 1]),
            }}
          >
            七大维度
          </div>

          {/* 维度标签环形分布 */}
          {dimensions.map((d, i) => {
            const angle = (i / dimensions.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * ringRadius;
            const y = Math.sin(angle) * ringRadius;
            const delay = 15 + i * 6;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={d.label}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 600,
                  color: d.color,
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                {d.label}
              </div>
            );
          })}
        </div>

        {/* 核心 slogan */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(sloganProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(sloganProg, [0, 1], [0.9, 1])})`,
          }}
        >
          技术越强大，人性越值钱
        </div>

        {/* 底部金句 */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
          }}
        >
          一个人 + 一个 Agent = 一家公司
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
