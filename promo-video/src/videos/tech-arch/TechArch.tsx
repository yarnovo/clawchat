import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneTaIntro } from "./SceneTaIntro";
import { SceneTaLayers } from "./SceneTaLayers";
import { SceneTaRuntime } from "./SceneTaRuntime";
import { SceneTaContainer } from "./SceneTaContainer";
import { SceneTaData } from "./SceneTaData";
import { SceneTaStack } from "./SceneTaStack";
import { SceneTaOutro } from "./SceneTaOutro";
import { Subtitle } from "../../Subtitle";

import taIntroWords from "./words/ta-intro-words.json";
import taLayersWords from "./words/ta-layers-words.json";
import taRuntimeWords from "./words/ta-runtime-words.json";
import taContainerWords from "./words/ta-container-words.json";
import taDataWords from "./words/ta-data-words.json";
import taStackWords from "./words/ta-stack-words.json";
import taOutroWords from "./words/ta-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneTaIntro, SceneTaLayers, SceneTaRuntime, SceneTaContainer,
  SceneTaData, SceneTaStack, SceneTaOutro,
];
const SCENE_WORDS = [
  taIntroWords, taLayersWords, taRuntimeWords, taContainerWords,
  taDataWords, taStackWords, taOutroWords,
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

export const TechArch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/tech-arch/tech-arch.mp3")} volume={0.9} />
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
