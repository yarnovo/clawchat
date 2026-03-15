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

const importsCode = `import { Command } from 'commander';
import { AgentRunner } from '@agentkit/agentic';
import { OpenAIProvider } from '@agentkit/provider-llm-openai';
import { SQLiteSession } from '@agentkit/provider-session-sqlite';
import { skillsExtension } from '@agentkit/extension-skills';
import { memoryExtension } from '@agentkit/extension-memory';
import { schedulerChannel } from '@agentkit/channel-scheduler';
import { httpChannel } from '@agentkit/channel-http';
import { runScorers } from '@agentkit/eval';`;

const pathCode = `const BUILTIN_SKILLS_DIR = path.resolve(
  __dirname, '../../extension-skills/builtins'
);`;

const commands = [
  { name: "run", desc: "运行" },
  { name: "eval", desc: "评估" },
  { name: "info", desc: "信息" },
  { name: "serve", desc: "服务" },
];

export const SceneWkclOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 24, fps, config: { damping: 14, mass: 0.7 } });
  const pathProg = spring({ frame: frame - 60, fps, config: { damping: 14, mass: 0.7 } });
  const cmdProg = spring({ frame: frame - 80, fps, config: { damping: 12, mass: 0.6 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          paddingBottom: 140,
          padding: "0 80px 140px",
        }}
      >
        {/* Left: code block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
            maxWidth: 900,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontFamily: FONT,
              fontSize: 56,
              fontWeight: 700,
              color: COLORS.text,
              letterSpacing: -1,
              opacity: interpolate(titleProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            }}
          >
            @agentkit/cli
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: COLORS.muted,
              letterSpacing: 2,
              opacity: interpolate(subProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(subProg, [0, 1], [14, 0])}px)`,
            }}
          >
            commander + 9 个包 = 完整入口
          </div>

          {/* Imports code block */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: "28px 32px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(codeProg, [0, 1], [24, 0])}px)`,
            }}
          >
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 18,
                lineHeight: 1.7,
                color: COLORS.text,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {importsCode.split("\n").map((line, i) => {
                const pkg = line.match(/'(@agentkit\/[^']+)'/)?.[1];
                const from = line.match(/from\s/);
                if (pkg && from) {
                  const parts = line.split(pkg);
                  return (
                    <div key={i}>
                      <span style={{ color: COLORS.muted }}>{parts[0]}</span>
                      <span style={{ color: COLORS.accent, fontWeight: 700 }}>{pkg}</span>
                      <span style={{ color: COLORS.muted }}>{parts[1]}</span>
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ color: COLORS.muted }}>
                    {line}
                  </div>
                );
              })}
            </pre>
          </div>

          {/* BUILTIN_SKILLS_DIR */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: "20px 32px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(pathProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(pathProg, [0, 1], [18, 0])}px)`,
            }}
          >
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 19,
                lineHeight: 1.7,
                color: COLORS.accent,
                fontWeight: 600,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {pathCode}
            </pre>
          </div>
        </div>

        {/* Right: 4 command cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            opacity: interpolate(cmdProg, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(cmdProg, [0, 1], [40, 0])}px)`,
          }}
        >
          {commands.map((cmd, i) => {
            const delay = 84 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.5 },
            });
            return (
              <div
                key={cmd.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: "20px 36px",
                  minWidth: 200,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {cmd.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {cmd.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
