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

const funcs = [
  { name: "buildIndex()", desc: "扫描 skills/ 目录，读 _meta.json + SKILL.md，建内存 Map" },
  { name: "searchSkills()", desc: "关键词分词，对 slug/name/desc 分别打分排序" },
  { name: "getSkill()", desc: "slugMap.get() 直接 O(1) 查找" },
  { name: "listSkills()", desc: "按 publishedAt 排序，cursor 分页" },
];

export const SceneDevStore: React.FC = () => {
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
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 48, fontWeight: 700, color: COLORS.accent }}>
            store.ts
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted }}>
            数据层
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 900 }}>
          {funcs.map((f, i) => {
            const delay = 12 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={f.name}
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
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: COLORS.accent, width: 240, flexShrink: 0 }}>
                  {f.name}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted }}>
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 22,
            color: COLORS.subtle,
            opacity: interpolate(
              spring({ frame: frame - 55, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
          }}
        >
          25,425 skills · 3s index build
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
