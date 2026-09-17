import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { storyboardSchema, type Storyboard } from "../models/storyboard.ts";
import { VOCABULARY_SECTION_IDS } from "../models/vocabulary.ts";
import type { PipelineState } from "../pipeline/pipelineState.ts";
import { VIDEO_DEFAULTS } from "../models/video.ts";
import { findCopyQualityIssues } from "../utils/copyQuality.ts";
import {
  getSceneStartSeconds,
  getStoryboardDurationInSeconds,
} from "../utils/duration.ts";

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

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
  if (duration > VIDEO_DEFAULTS.maxDurationSeconds) {
    throw new Error(
      `QA: duration is ${duration.toFixed(2)}s, need at most ${VIDEO_DEFAULTS.maxDurationSeconds}s.`,
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
    if (
      scene.audioDurationSeconds !== undefined &&
      scene.durationInSeconds - scene.audioDurationSeconds > 6
    ) {
      throw new Error(
        `QA: scene "${scene.id}" has more than 6 seconds of trailing visual hold.`,
      );
    }
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

  if (!state.script) {
    throw new Error("QA: vocabulary script is missing from pipeline state.");
  }
  const word = state.script.vocabulary.word.toLowerCase();
  if (!/^[a-z-]+$/.test(word)) {
    throw new Error("QA: the requested topic is not one English word.");
  }
  const sectionIds = new Set(state.script.sections.map((section) => section.id));
  for (const sectionId of VOCABULARY_SECTION_IDS) {
    if (!sectionIds.has(sectionId)) {
      throw new Error(`QA: script is missing the "${sectionId}" lesson section.`);
    }
  }
  if (state.script.vocabulary.examples.length < 3) {
    throw new Error("QA: vocabulary lesson needs at least three examples.");
  }
  // The first frame is reused as the video cover, so the word, its IPA and the
  // part of speech must be on screen from frame 0 without an entrance animation.
  const introScene = state.storyboard.scenes.find(
    (scene) => scene.id === "intro",
  );
  if (!introScene) {
    throw new Error("QA: storyboard is missing the intro scene.");
  }
  if (introScene.onScreenText.title.trim().toLowerCase() !== word) {
    throw new Error(`QA: intro must show the word "${word}" as its title.`);
  }
  if (
    !introScene.onScreenText.pronunciation?.trim() ||
    !introScene.onScreenText.partOfSpeech?.trim()
  ) {
    throw new Error("QA: intro must show the pronunciation and part of speech.");
  }
  if (introScene.animation.enter !== "none") {
    throw new Error(
      "QA: intro must not animate in, otherwise the cover frame starts blank.",
    );
  }
  const exampleScene = state.storyboard.scenes.find(
    (scene) => scene.id === "examples",
  );
  if (
    !exampleScene ||
    exampleScene.visual.items?.length !==
      state.script.vocabulary.examples.length
  ) {
    throw new Error("QA: examples scene must show every full example sentence.");
  }
  if (
    state.storyboard.scenes.some(
      (scene, index) =>
        scene.onScreenText.progressLabel !==
        `${index + 1} / ${state.storyboard?.scenes.length}`,
    )
  ) {
    throw new Error("QA: every scene needs a progress label.");
  }

  const starts = getSceneStartSeconds(state.storyboard);
  for (const sceneId of ["examples"]) {
    const sceneIndex = state.storyboard.scenes.findIndex(
      (scene) => scene.id === sceneId,
    );
    if (sceneIndex === -1) {
      continue;
    }
    const sceneStartMs = Math.round(starts[sceneIndex] * 1000);
    // The next scene overlaps this one by the transition duration, so its
    // first cue may legitimately start before this scene ends.
    const sceneEndMs = Math.round(
      (starts[sceneIndex + 1] ??
        starts[sceneIndex] +
          state.storyboard.scenes[sceneIndex].durationInSeconds) * 1000,
    );
    if (
      state.storyboard.captions.some(
        (cue) => cue.startMs >= sceneStartMs && cue.startMs < sceneEndMs,
      )
    ) {
      throw new Error(
        `QA: scene "${sceneId}" repeats visible text in bottom captions.`,
      );
    }
  }
  const combinedNarration = state.storyboard.scenes
    .map((scene) => scene.narration)
    .join(" ")
    .toLowerCase();
  if (!combinedNarration.includes(word)) {
    throw new Error(`QA: narration never mentions the target word "${word}".`);
  }
  const forbiddenGenericCopy = [
    "public speaking",
    "one clear message",
    "two or three supporting points",
  ];
  const genericCopy = forbiddenGenericCopy.find((phrase) =>
    combinedNarration.includes(phrase),
  );
  if (genericCopy) {
    throw new Error(`QA: generic explainer copy leaked into the lesson: "${genericCopy}".`);
  }
  const normalizedNarrations = state.storyboard.scenes.map((scene) =>
    normalizeText(scene.narration),
  );
  if (new Set(normalizedNarrations).size !== normalizedNarrations.length) {
    throw new Error("QA: two scenes contain duplicate narration.");
  }
  const copyQualityIssues = findCopyQualityIssues(state.script);
  if (copyQualityIssues.length > 0) {
    throw new Error(`QA: ${copyQualityIssues.join(" ")}`);
  }
  if (
    !state.storyboard.captions.some((cue) =>
      cue.text.toLowerCase().includes(word),
    )
  ) {
    throw new Error(`QA: captions never show the target word "${word}".`);
  }

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
