import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ScenePpIntro } from "./ScenePpIntro";
import { ScenePpInstall } from "./ScenePpInstall";
import { ScenePpUninstall } from "./ScenePpUninstall";
import { ScenePpMaintain } from "./ScenePpMaintain";
import { ScenePpSolution } from "./ScenePpSolution";
import { ScenePpCompare } from "./ScenePpCompare";
import { ScenePpOutro } from "./ScenePpOutro";
import { Subtitle } from "../../Subtitle";

import ppIntroWords from "./words/pp-intro-words.json";
import ppInstallWords from "./words/pp-install-words.json";
import ppUninstallWords from "./words/pp-uninstall-words.json";
import ppMaintainWords from "./words/pp-maintain-words.json";
import ppSolutionWords from "./words/pp-solution-words.json";
import ppCompareWords from "./words/pp-compare-words.json";
import ppOutroWords from "./words/pp-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  ScenePpIntro,
  ScenePpInstall,
  ScenePpUninstall,
  ScenePpMaintain,
  ScenePpSolution,
  ScenePpCompare,
  ScenePpOutro,
];
const SCENE_WORDS = [
  ppIntroWords,
  ppInstallWords,
  ppUninstallWords,
  ppMaintainWords,
  ppSolutionWords,
  ppCompareWords,
  ppOutroWords,
];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(
    0,
    Math.round((t.startMs / 1000) * FPS) - INTRO_PAD,
  );
  const isLast = i === timingData.length - 1;

  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart =
      Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
    endFrame = nextStart;
  }

  return {
    from: startFrame,
    dur: endFrame - startFrame,
    words: SCENE_WORDS[i],
    Comp: SCENE_COMPS[i],
    startMs: t.startMs,
  };
});

export const TOTAL_FRAMES =
  scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{
  children: React.ReactNode;
  dur: number;
  isLast?: boolean;
}> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast
    ? 1
    : interpolate(frame, [dur - FADE, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const PainPoints: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio
        src={staticFile("audio/pain-points/pain-points.mp3")}
        volume={0.9}
      />
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
