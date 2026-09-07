import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDuration } from "./get-audio-duration";
import type { DemoVideoProps } from "../DemoVideo";

const FPS = 30;

// Measured from the generated voice-over:
// "Welcome to AI Video." + short pause between sentences.
const SCENE_1_SECONDS = 1.675;
// Last phrase of sentence 2 ("how AI agents work") plus a short tail.
const SCENE_3_SECONDS = 1.62;

export const calculateDemoMetadata: CalculateMetadataFunction<
  DemoVideoProps
> = async ({ props }) => {
  const durationInSeconds = await getAudioDuration(
    staticFile(props.voiceoverFile),
  );
  const durationInFrames = Math.max(1, Math.ceil(durationInSeconds * FPS));

  const scene1Frames = Math.min(
    durationInFrames - 2,
    Math.max(1, Math.round(SCENE_1_SECONDS * FPS)),
  );
  const remaining = durationInFrames - scene1Frames;
  const scene3Frames = Math.min(
    remaining - 1,
    Math.max(1, Math.round(SCENE_3_SECONDS * FPS)),
  );
  const scene2Frames = remaining - scene3Frames;

  return {
    durationInFrames,
    props: {
      ...props,
      scene1Frames,
      scene2Frames,
      scene3Frames,
    },
  };
};
