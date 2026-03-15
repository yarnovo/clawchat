import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneAtIntro } from "./SceneAtIntro";
import { SceneAtAgent } from "./SceneAtAgent";
import { SceneAtModels } from "./SceneAtModels";
import { SceneAtWorld } from "./SceneAtWorld";
import { SceneAtRobot } from "./SceneAtRobot";
import { SceneAtCoding } from "./SceneAtCoding";
import { SceneAtScience } from "./SceneAtScience";
import { SceneAtInfra } from "./SceneAtInfra";
import { SceneAtSafety } from "./SceneAtSafety";
import { SceneAtOutro } from "./SceneAtOutro";
import { Subtitle } from "../../Subtitle";

import atIntroWords from "./words/at-intro-words.json";
import atAgentWords from "./words/at-agent-words.json";
import atModelsWords from "./words/at-models-words.json";
import atWorldWords from "./words/at-world-words.json";
import atRobotWords from "./words/at-robot-words.json";
import atCodingWords from "./words/at-coding-words.json";
import atScienceWords from "./words/at-science-words.json";
import atInfraWords from "./words/at-infra-words.json";
import atSafetyWords from "./words/at-safety-words.json";
import atOutroWords from "./words/at-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneAtIntro, SceneAtAgent, SceneAtModels, SceneAtWorld, SceneAtRobot,
  SceneAtCoding, SceneAtScience, SceneAtInfra, SceneAtSafety, SceneAtOutro,
];
const SCENE_WORDS = [
  atIntroWords, atAgentWords, atModelsWords, atWorldWords, atRobotWords,
  atCodingWords, atScienceWords, atInfraWords, atSafetyWords, atOutroWords,
];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart = Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
    endFrame = nextStart;
  }
  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], Comp: SCENE_COMPS[i], startMs: t.startMs };
});

export const TOTAL_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast ? 1 : interpolate(frame, [dur - FADE, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const AiTrends2026: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/ai-trends-2026/ai-trends-2026.mp3")} volume={0.9} />
      {scenes.map((s, i) => {
        const isLast = i === scenes.length - 1;
        const seqDur = isLast ? s.dur : s.dur + FADE;
        const sceneStartMs = (s.from / FPS) * 1000;
        return (
          <Sequence key={i} from={s.from} durationInFrames={seqDur}>
            <Scene dur={seqDur} isLast={isLast}>
              <s.Comp />
              <AbsoluteFill style={{ zIndex: 100 }}>
                <Subtitle words={s.words as any} offsetMs={sceneStartMs} />
              </AbsoluteFill>
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
