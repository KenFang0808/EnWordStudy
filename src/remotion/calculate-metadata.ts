import type { CalculateMetadataFunction } from "remotion";
import type { AIVideoProps } from "../models/video";
import { getStoryboardDurationInFrames } from "../utils/duration";
import { loadStoryboard } from "../utils/storyboard";

export const calculateAIVideoMetadata: CalculateMetadataFunction<
  AIVideoProps
> = () => {
  const storyboard = loadStoryboard();

  return {
    durationInFrames: getStoryboardDurationInFrames(storyboard),
    fps: storyboard.fps,
    width: storyboard.width,
    height: storyboard.height,
    defaultOutName: "phase1",
  };
};
