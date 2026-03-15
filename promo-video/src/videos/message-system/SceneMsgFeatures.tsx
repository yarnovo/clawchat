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

const features = [
  { name: "游标分页", desc: "before + limit，加载快且准" },
  { name: "消息撤回", desc: "软删除 deletedAt，不丢数据" },
  { name: "离线同步", desc: "多设备无缝切换（规划中）" },
  { name: "消息类型", desc: "文字 / 图片 / 语音" },
];

export const SceneMsgFeatures: React.FC = () => {
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
        {/* Title */}
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
          消息特性
        </div>

        {/* Feature list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {features.map((feat, i) => {
            const rowProg = spring({
              frame: frame - 12 - i * 10,
              fps,
              config: { damping: 14 },
            });

            return (
              <div
                key={feat.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(rowProg, [0, 1], [20, 0])}px)`,
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  padding: "16px 28px",
                  width: 620,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.accent,
                    flexShrink: 0,
                    width: 160,
                  }}
                >
                  {feat.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.muted,
                  }}
                >
                  {feat.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
