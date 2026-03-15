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

const categories = [
  { name: "文件操作", count: 4, items: "Read / Write / Edit / Glob" },
  { name: "记忆", count: 4, items: "MemoryStore / MemoryQuery / MemoryDelete / MemoryList" },
  { name: "任务", count: 5, items: "TaskCreate / TaskUpdate / TaskList / TaskAssign / TaskArchive" },
  { name: "定时任务", count: 6, items: "CronCreate / CronUpdate / CronDelete / CronList / CronPause / CronResume" },
  { name: "技能市场", count: 4, items: "SkillSearch / SkillInstall / SkillUninstall / SkillList" },
  { name: "工具管理", count: 7, items: "ToolEnable / ToolDisable / ToolConfig / ToolList / ToolReset / ToolPermission / ToolAudit" },
  { name: "媒体", count: 3, items: "ImageGenerate / ImageEdit / ImageDescribe" },
  { name: "密钥", count: 2, items: "SecretStore / SecretRetrieve" },
];

export const SceneTcIronclaw: React.FC = () => {
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
          gap: 14,
          paddingBottom: 140,
          paddingTop: 30,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
            marginBottom: 4,
          }}
        >
          <span style={{ color: "#7C5CBF" }}>IronClaw</span> · 40+ 个工具
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9, width: 1200 }}>
          {categories.map((cat, i) => {
            const delay = 8 + i * 5;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={cat.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "11px 24px",
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
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: "#7C5CBF",
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {cat.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.text,
                    width: 36,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {cat.count}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {cat.items}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
