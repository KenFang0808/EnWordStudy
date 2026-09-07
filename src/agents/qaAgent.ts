import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { storyboardSchema, type Storyboard } from "../models/storyboard.ts";
import type { PipelineState } from "../pipeline/pipelineState.ts";
import { VIDEO_DEFAULTS } from "../models/video.ts";
import { getStoryboardDurationInSeconds } from "../utils/duration.ts";

const formatIssues = (
  issues: Array<{ path: PropertyKey[]; message: string }>,
): string => {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.map(String).join(".") : "storyboard";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
};

const assertFile = (relativePath: string, label: string): void => {
  const absolutePath = relativePath.startsWith("/")
    ? relativePath
    : join(process.cwd(), relativePath.startsWith("output/") || relativePath.startsWith("data/") || relativePath.startsWith("public/")
        ? relativePath
        : join("public", relativePath));

  if (!existsSync(absolutePath)) {
    throw new Error(`${label} is missing: ${absolutePath}`);
  }

  if (statSync(absolutePath).size <= 0) {
    throw new Error(`${label} is empty: ${absolutePath}`);
  }
};

export const validateStoryboard = (storyboard: Storyboard): void => {
  const parsed = storyboardSchema.safeParse(storyboard);
  if (!parsed.success) {
    throw new Error(`QA: storyboard schema is invalid: ${formatIssues(parsed.error.issues)}`);
  }

  const duration = getStoryboardDurationInSeconds(parsed.data);
  if (duration < VIDEO_DEFAULTS.minDurationSeconds) {
    throw new Error(
      `QA: duration is ${duration.toFixed(2)}s, need at least ${VIDEO_DEFAULTS.minDurationSeconds}s.`,
    );
  }

  for (const scene of parsed.data.scenes) {
    if (scene.durationInSeconds <= 0) {
      throw new Error(`QA: scene "${scene.id}" has an invalid duration.`);
    }
    if (scene.narration.trim().length === 0) {
      throw new Error(`QA: scene "${scene.id}" is missing narration.`);
    }
    if (!scene.voiceoverFile) {
      throw new Error(`QA: scene "${scene.id}" is missing a voice-over file.`);
    }
    assertFile(scene.voiceoverFile, `Voice-over for ${scene.id}`);
  }

  if (!parsed.data.musicFile) {
    throw new Error("QA: background music file is missing from the storyboard.");
  }
  assertFile(parsed.data.musicFile, "Background music");

  if (parsed.data.captions.length === 0) {
    throw new Error("QA: captions are missing.");
  }
};

export const runQa = (state: PipelineState, phase: "pre-render" | "post-render"): void => {
  if (!state.storyboard) {
    throw new Error("QA: storyboard is missing from pipeline state.");
  }

  validateStoryboard(state.storyboard);

  if (state.previewFrames.length === 0) {
    throw new Error("QA: preview frames were not rendered.");
  }
  for (const frame of state.previewFrames) {
    assertFile(frame, "Preview frame");
  }

  if (phase === "post-render") {
    if (!state.outputPath) {
      throw new Error("QA: final MP4 path is missing.");
    }
    assertFile(state.outputPath, "Final MP4");
  }
};
