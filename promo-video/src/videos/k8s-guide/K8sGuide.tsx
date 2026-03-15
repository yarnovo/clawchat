import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneK8sIntro } from "./SceneK8sIntro";
import { SceneK8sConcept } from "./SceneK8sConcept";
import { SceneK8sWhy } from "./SceneK8sWhy";
import { SceneK8sAgent } from "./SceneK8sAgent";
import { SceneK8sStart } from "./SceneK8sStart";
import { SceneK8sOutro } from "./SceneK8sOutro";
import { Subtitle } from "../../Subtitle";

import k8sIntroWords from "./words/k8s-intro-words.json";
import k8sConceptWords from "./words/k8s-concept-words.json";
import k8sWhyWords from "./words/k8s-why-words.json";
import k8sAgentWords from "./words/k8s-agent-words.json";
import k8sStartWords from "./words/k8s-start-words.json";
import k8sOutroWords from "./words/k8s-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneK8sIntro, SceneK8sConcept, SceneK8sWhy, SceneK8sAgent,
  SceneK8sStart, SceneK8sOutro,
];
const SCENE_WORDS = [
  k8sIntroWords, k8sConceptWords, k8sWhyWords, k8sAgentWords,
  k8sStartWords, k8sOutroWords,
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

export const K8sGuide: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/k8s-guide/k8s-guide.mp3")} volume={0.9} />
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
