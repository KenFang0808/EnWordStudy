import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import type { AIVideoProps } from "../models/video";
import { secondsToFrames } from "../utils/duration";
import { loadStoryboard } from "../utils/storyboard";
import { Caption } from "./components/Caption";
import { ProgressBar } from "./components/ProgressBar";
import { SceneRenderer } from "./scenes/SceneRenderer";

const storyboard = loadStoryboard();

export const AIVideo: React.FC<AIVideoProps> = ({ showCaptions }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {storyboard.voiceoverFile ? (
        <Audio name="Voiceover" src={staticFile(storyboard.voiceoverFile)} />
      ) : null}
      {storyboard.musicFile ? (
        <Audio
          name="Music"
          src={staticFile(storyboard.musicFile)}
          volume={() => storyboard.musicVolume}
        />
      ) : null}
      <TransitionSeries>
        {storyboard.scenes.flatMap((scene, index) => {
          const sequence = (
            <TransitionSeries.Sequence
              key={scene.id}
              durationInFrames={secondsToFrames(scene.durationInSeconds, fps)}
              name={scene.id}
            >
              {scene.voiceoverFile ? (
                <Audio
                  name={`${scene.id} voice`}
                  src={staticFile(scene.voiceoverFile)}
                />
              ) : null}
              <SceneRenderer scene={scene} />
            </TransitionSeries.Sequence>
          );

          const isLast = index === storyboard.scenes.length - 1;
          if (isLast || scene.transition.type === "none") {
            return [sequence];
          }

          const transitionFrames = secondsToFrames(
            scene.transition.durationInSeconds,
            fps,
          );
          const presentation =
            scene.transition.type === "slide"
              ? slide({ direction: "from-right" })
              : fade();

          return [
            sequence,
            <TransitionSeries.Transition
              key={`${scene.id}-transition`}
              presentation={presentation}
              timing={linearTiming({ durationInFrames: transitionFrames })}
            />,
          ];
        })}
      </TransitionSeries>
      <ProgressBar />
      {showCaptions ? <Caption cues={storyboard.captions} /> : null}
    </AbsoluteFill>
  );
};
