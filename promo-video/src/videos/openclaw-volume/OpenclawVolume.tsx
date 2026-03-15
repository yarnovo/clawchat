import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneOvIntro } from "./SceneOvIntro";
import { SceneOvOverview } from "./SceneOvOverview";
import { SceneOvSessions } from "./SceneOvSessions";
import { SceneOvExtensions } from "./SceneOvExtensions";
import { SceneOvWorkspace } from "./SceneOvWorkspace";
import { SceneOvMount } from "./SceneOvMount";
import { SceneOvOutro } from "./SceneOvOutro";
import { Subtitle } from "../../Subtitle";

import ovIntroWords from "./words/ov-intro-words.json";
import ovOverviewWords from "./words/ov-overview-words.json";
import ovSessionsWords from "./words/ov-sessions-words.json";
import ovExtensionsWords from "./words/ov-extensions-words.json";
import ovWorkspaceWords from "./words/ov-workspace-words.json";
import ovMountWords from "./words/ov-mount-words.json";
import ovOutroWords from "./words/ov-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneOvIntro, SceneOvOverview, SceneOvSessions, SceneOvExtensions,
  SceneOvWorkspace, SceneOvMount, SceneOvOutro,
];
const SCENE_WORDS = [
  ovIntroWords, ovOverviewWords, ovSessionsWords, ovExtensionsWords,
  ovWorkspaceWords, ovMountWords, ovOutroWords,
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

export const OpenclawVolume: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/openclaw-volume/openclaw-volume.mp3")} volume={0.9} />
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
