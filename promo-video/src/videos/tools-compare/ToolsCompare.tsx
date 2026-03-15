import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneTcIntro } from "./SceneTcIntro";
import { SceneTcOpenclaw } from "./SceneTcOpenclaw";
import { SceneTcNanoclaw } from "./SceneTcNanoclaw";
import { SceneTcIronclaw } from "./SceneTcIronclaw";
import { SceneTcUnique } from "./SceneTcUnique";
import { SceneTcOutro } from "./SceneTcOutro";
import { Subtitle } from "../../Subtitle";

import tcIntroWords from "./words/tc-intro-words.json";
import tcOpenclawWords from "./words/tc-openclaw-words.json";
import tcNanoclawWords from "./words/tc-nanoclaw-words.json";
import tcIronclawWords from "./words/tc-ironclaw-words.json";
import tcUniqueWords from "./words/tc-unique-words.json";
import tcOutroWords from "./words/tc-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneTcIntro, SceneTcOpenclaw, SceneTcNanoclaw, SceneTcIronclaw,
  SceneTcUnique, SceneTcOutro,
];
const SCENE_WORDS = [
  tcIntroWords, tcOpenclawWords, tcNanoclawWords, tcIronclawWords,
  tcUniqueWords, tcOutroWords,
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

export const ToolsCompare: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/tools-compare/tools-compare.mp3")} volume={0.9} />
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
