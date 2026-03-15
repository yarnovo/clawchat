import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneWkcsOverview } from "./SceneWkcsOverview";
import { SceneWkcsParse } from "./SceneWkcsParse";
import { SceneWkcsSetup } from "./SceneWkcsSetup";
import { SceneWkcsLogging } from "./SceneWkcsLogging";
import { Subtitle } from "../../Subtitle";

import wkcsOverviewWords from "./words/wkcs-overview-words.json";
import wkcsParseWords from "./words/wkcs-parse-words.json";
import wkcsSetupWords from "./words/wkcs-setup-words.json";
import wkcsLoggingWords from "./words/wkcs-logging-words.json";

import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [SceneWkcsOverview, SceneWkcsParse, SceneWkcsSetup, SceneWkcsLogging];
const SCENE_WORDS_ARR = [wkcsOverviewWords, wkcsParseWords, wkcsSetupWords, wkcsLoggingWords];

const SCENES = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart = Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
    endFrame = nextStart;
  }
  return { from: startFrame, dur: endFrame - startFrame, Comp: SCENE_COMPS[i], words: SCENE_WORDS_ARR[i] };
});

export const WK_CH_SCHEDULER_FRAMES =
  SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].dur;

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

export const WkChScheduler: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/wk-ch-scheduler/wk-ch-scheduler.mp3")} volume={0.9} />
      {SCENES.map((s, i) => {
        const isLast = i === SCENES.length - 1;
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
