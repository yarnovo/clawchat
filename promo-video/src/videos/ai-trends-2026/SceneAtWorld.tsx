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

const players = [
  { name: "World Labs", person: "李飞飞", product: "Marble", detail: "$50 亿估值" },
  { name: "DeepMind", person: "Google", product: "Genie 3", detail: "实时 3D 交互" },
  { name: "AMI Labs", person: "LeCun", product: "世界模型", detail: "€5 亿融资" },
];

export const SceneAtWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const statProg = spring({ frame: frame - 50, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          世界模型 · 空间智能
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          {players.map((p, i) => {
            const delay = 12 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={p.name}
                style={{
                  width: 280,
                  padding: "32px 24px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${i === 0 ? COLORS.accent : COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: FONT_SANS, fontSize: 32, fontWeight: 700, color: COLORS.text }}>
                  {p.name}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {p.person}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {p.product}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.subtle }}>
                  {p.detail}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(statProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(statProg, [0, 1], [10, 0])}px)`,
          }}
        >
          $13 亿+ 融资涌入世界模型赛道
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
