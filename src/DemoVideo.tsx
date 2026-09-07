import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, staticFile } from "remotion";
import { Scene1 } from "./DemoVideo/Scene1";
import { Scene2 } from "./DemoVideo/Scene2";
import { Scene3 } from "./DemoVideo/Scene3";

export type DemoVideoProps = {
  readonly voiceoverFile: string;
  readonly scene1Frames: number;
  readonly scene2Frames: number;
  readonly scene3Frames: number;
};

export const DemoVideo: React.FC<DemoVideoProps> = ({
  voiceoverFile = "audio/voiceover.mp3",
  scene1Frames,
  scene2Frames,
  scene3Frames,
}) => {
  return (
    <AbsoluteFill>
      <Audio name="Voiceover" src={staticFile(voiceoverFile)} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={scene1Frames} name="Scene1">
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence durationInFrames={scene2Frames} name="Scene2">
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence durationInFrames={scene3Frames} name="Scene3">
          <Scene3 sceneDurationInFrames={scene3Frames} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
