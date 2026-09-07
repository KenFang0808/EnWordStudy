import type { VideoRequest } from "../models/input.ts";
import type { Script } from "../models/script.ts";
import type { Storyboard } from "../models/storyboard.ts";

export const PIPELINE_STAGES = [
  "validate-input",
  "script",
  "storyboard",
  "visual",
  "image",
  "voice",
  "music",
  "captions",
  "compose",
  "preview",
  "qa",
  "render",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type PipelineState = {
  stage: PipelineStage;
  request: VideoRequest;
  script?: Script;
  storyboard?: Storyboard;
  previewFrames: string[];
  outputPath?: string;
};

export const createPipelineState = (request: VideoRequest): PipelineState => {
  return {
    stage: "validate-input",
    request,
    previewFrames: [],
  };
};
