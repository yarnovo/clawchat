import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneBaIntro } from "./SceneBaIntro";
import { SceneBaNoIm } from "./SceneBaNoIm";
import { SceneBaApi } from "./SceneBaApi";
import { SceneBaFlow } from "./SceneBaFlow";
import { SceneBaFork } from "./SceneBaFork";
import { SceneBaK3s } from "./SceneBaK3s";
import { SceneBaOutro } from "./SceneBaOutro";
import { Subtitle } from "../../Subtitle";

import baIntroWords from "./words/ba-intro-words.json";
import baNoImWords from "./words/ba-no-im-words.json";
import baApiWords from "./words/ba-api-words.json";
import baFlowWords from "./words/ba-flow-words.json";
import baForkWords from "./words/ba-fork-words.json";
import baK3sWords from "./words/ba-k3s-words.json";
import baOutroWords from "./words/ba-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneBaIntro, SceneBaNoIm, SceneBaApi,
  SceneBaFlow, SceneBaFork, SceneBaK3s, SceneBaOutro,
];
const SCENE_WORDS = [
  baIntroWords, baNoImWords, baApiWords,
  baFlowWords, baForkWords, baK3sWords, baOutroWords,
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

export const BackendArch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/backend-arch/backend-arch.mp3")} volume={0.9} />
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
