import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneWkagOverview } from "./SceneWkagOverview";
import { SceneWkagInterfaces } from "./SceneWkagInterfaces";
import { SceneWkagRunner1 } from "./SceneWkagRunner1";
import { SceneWkagRunner2 } from "./SceneWkagRunner2";
import { Subtitle } from "../../Subtitle";

import wkagOverviewWords from "./words/wkag-overview-words.json";
import wkagInterfacesWords from "./words/wkag-interfaces-words.json";
import wkagRunner1Words from "./words/wkag-runner-1-words.json";
import wkagRunner2Words from "./words/wkag-runner-2-words.json";

import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [SceneWkagOverview, SceneWkagInterfaces, SceneWkagRunner1, SceneWkagRunner2];
const SCENE_WORDS = [wkagOverviewWords, wkagInterfacesWords, wkagRunner1Words, wkagRunner2Words];

const sceneDefs = timingData.map((t, i) => {
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

export const WK_AGENTIC_FRAMES = sceneDefs[sceneDefs.length - 1].from + sceneDefs[sceneDefs.length - 1].dur;

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

export const WkAgentic: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/wk-agentic/wk-agentic.mp3")} volume={0.9} />
      {sceneDefs.map((s, i) => {
        const isLast = i === sceneDefs.length - 1;
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
