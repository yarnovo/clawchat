import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneDevIntro } from "./SceneDevIntro";
import { SceneDevStore } from "./SceneDevStore";
import { SceneDevApi } from "./SceneDevApi";
import { SceneDevZip } from "./SceneDevZip";
import { SceneDevWellknown } from "./SceneDevWellknown";
import { SceneDevInject } from "./SceneDevInject";
import { SceneDevInfra } from "./SceneDevInfra";
import { SceneDevOutro } from "./SceneDevOutro";
import { Subtitle } from "../../Subtitle";

import devIntroWords from "./words/dev-intro-words.json";
import devStoreWords from "./words/dev-store-words.json";
import devApiWords from "./words/dev-api-words.json";
import devZipWords from "./words/dev-zip-words.json";
import devWellknownWords from "./words/dev-wellknown-words.json";
import devInjectWords from "./words/dev-inject-words.json";
import devInfraWords from "./words/dev-infra-words.json";
import devOutroWords from "./words/dev-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneDevIntro, SceneDevStore, SceneDevApi, SceneDevZip,
  SceneDevWellknown, SceneDevInject, SceneDevInfra, SceneDevOutro,
];
const SCENE_WORDS = [
  devIntroWords, devStoreWords, devApiWords, devZipWords,
  devWellknownWords, devInjectWords, devInfraWords, devOutroWords,
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

export const SkillDevwalk: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/skill-devwalk/skill-devwalk.mp3")} volume={0.9} />
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
