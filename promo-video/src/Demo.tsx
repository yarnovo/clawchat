import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneIntro } from "./SceneIntro";
import { ScenePainPoints } from "./ScenePainPoints";
import { SceneSolution } from "./SceneSolution";
import { SceneChat } from "./SceneChat";
import { SceneCapabilities } from "./SceneCapabilities";
import { ScenePositioning } from "./ScenePositioning";
import { SceneOutro } from "./SceneOutro";
import { Subtitle } from "./Subtitle";

// ─── 字幕数据（edge-tts word boundary） ───
import introWords from "./words/intro-words.json";
import painpointsWords from "./words/painpoints-words.json";
import solutionWords from "./words/solution-words.json";
import chatWords from "./words/chat-words.json";
import capabilitiesWords from "./words/capabilities-words.json";
import positioningWords from "./words/positioning-words.json";
import outroWords from "./words/outro-words.json";

// ─── 场景时间轴（30fps） ───
//   Intro:        0-119   (4s)
//   PainPoints:   120-269 (5s)
//   Solution:     270-419 (5s)
//   Chat:         420-599 (6s)
//   Capabilities: 600-779 (6s)
//   Positioning:  780-914 (4.5s)
//   Outro:        915-1004 (3s)
// 总计: 33.5s = 1005 frames

const FADE = 15;

const scenes = [
  { dur: 120,  delay: 20, words: introWords,        Comp: SceneIntro,        audio: "audio/intro.mp3" },
  { dur: 150,  delay: 20, words: painpointsWords,    Comp: ScenePainPoints,   audio: "audio/painpoints.mp3" },
  { dur: 150,  delay: 10, words: solutionWords,      Comp: SceneSolution,     audio: "audio/solution.mp3" },
  { dur: 180,  delay: 20, words: chatWords,           Comp: SceneChat,         audio: "audio/chat.mp3" },
  { dur: 180,  delay: 15, words: capabilitiesWords,  Comp: SceneCapabilities, audio: "audio/capabilities.mp3" },
  { dur: 135,  delay: 10, words: positioningWords,   Comp: ScenePositioning,  audio: "audio/positioning.mp3" },
  { dur: 90,   delay: 10, words: outroWords,          Comp: SceneOutro,        audio: "audio/outro.mp3" },
] as const;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({
  children,
  dur,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const opacity = isLast
    ? 1
    : interpolate(frame, [dur - FADE, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Demo: React.FC = () => {
  let offset = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0c29" }}>
      {scenes.map((s, i) => {
        const from = offset;
        const isLast = i === scenes.length - 1;
        const seqDur = isLast ? s.dur : s.dur + FADE;
        offset += s.dur;

        return (
          <Sequence key={i} from={from} durationInFrames={seqDur}>
            <Scene dur={seqDur} isLast={isLast}>
              {/* 场景内容 */}
              <s.Comp />
              {/* 音频 */}
              <Sequence from={s.delay}>
                <Audio src={staticFile(s.audio)} volume={0.9} />
              </Sequence>
              {/* 字幕（最顶层） */}
              <AbsoluteFill style={{ zIndex: 100 }}>
                <Subtitle words={s.words as any} delayFrames={s.delay} />
              </AbsoluteFill>
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
