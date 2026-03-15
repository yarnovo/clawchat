import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneAaIntro } from "./SceneAaIntro";
import { SceneAaCompare } from "./SceneAaCompare";
import { SceneAaMoat } from "./SceneAaMoat";
import { SceneAaWorkflow } from "./SceneAaWorkflow";
import { SceneAaPricing } from "./SceneAaPricing";
import { SceneAaVerticals } from "./SceneAaVerticals";
import { SceneAaScale } from "./SceneAaScale";
import { SceneAaOutro } from "./SceneAaOutro";
import { Subtitle } from "../../Subtitle";

import aaIntroWords from "./words/aa-intro-words.json";
import aaCompareWords from "./words/aa-compare-words.json";
import aaMoatWords from "./words/aa-moat-words.json";
import aaWorkflowWords from "./words/aa-workflow-words.json";
import aaPricingWords from "./words/aa-pricing-words.json";
import aaVerticalsWords from "./words/aa-verticals-words.json";
import aaScaleWords from "./words/aa-scale-words.json";
import aaOutroWords from "./words/aa-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneAaIntro, SceneAaCompare, SceneAaMoat, SceneAaWorkflow,
  SceneAaPricing, SceneAaVerticals, SceneAaScale, SceneAaOutro,
];
const SCENE_WORDS = [
  aaIntroWords, aaCompareWords, aaMoatWords, aaWorkflowWords,
  aaPricingWords, aaVerticalsWords, aaScaleWords, aaOutroWords,
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

export const AgentAgency: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/agent-agency/agent-agency.mp3")} volume={0.9} />
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
