import type { CaptionCue, Storyboard } from "../models/storyboard.ts";
import { getSceneStartSeconds, getStoryboardDurationInSeconds } from "../utils/duration.ts";

const MAX_WORDS_PER_CUE = 16;

const normalizeText = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const chunkNarration = (text: string): string[] => {
  const sentences = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    if (words.length <= MAX_WORDS_PER_CUE) {
      chunks.push(sentence);
      continue;
    }

    const clauses = sentence
      .match(/[^,;:]+[,;:]?/g)
      ?.map((clause) => clause.trim())
      .filter(Boolean);
    if (clauses && clauses.every((clause) => clause.split(/\s+/).length <= MAX_WORDS_PER_CUE)) {
      chunks.push(...clauses);
      continue;
    }

    for (let index = 0; index < words.length; index += MAX_WORDS_PER_CUE) {
      chunks.push(words.slice(index, index + MAX_WORDS_PER_CUE).join(" "));
    }
  }

  return chunks.length > 0 ? chunks : [text];
};

export const generateCaptions = (storyboard: Storyboard): Storyboard => {
  const starts = getSceneStartSeconds(storyboard);
  const captions: CaptionCue[] = [];

  storyboard.scenes.forEach((scene, index) => {
    if (
      scene.id === "examples" ||
      scene.type === "outro" ||
      normalizeText(scene.onScreenText.title) ===
        normalizeText(scene.narration)
    ) {
      return;
    }

    const chunks = chunkNarration(scene.narration);
    const sceneStartMs = Math.round(starts[index] * 1000);
    const usableMs = Math.max(
      800,
      Math.round((scene.audioDurationSeconds ?? scene.durationInSeconds * 0.9) * 1000),
    );
    const totalWords = chunks.reduce(
      (sum, chunk) => sum + chunk.split(/\s+/).length,
      0,
    );
    let elapsedMs = 0;

    chunks.forEach((text, chunkIndex) => {
      const startMs = sceneStartMs + elapsedMs;
      const isLast = chunkIndex === chunks.length - 1;
      const durationMs = isLast
        ? usableMs - elapsedMs
        : Math.round(
            (text.split(/\s+/).length / Math.max(1, totalWords)) * usableMs,
          );
      elapsedMs += durationMs;
      const endMs = sceneStartMs + elapsedMs;
      captions.push({ text, startMs, endMs });
    });
  });

  const videoEndMs = Math.round(getStoryboardDurationInSeconds(storyboard) * 1000);
  const last = captions[captions.length - 1];
  if (last && last.endMs > videoEndMs) {
    last.endMs = videoEndMs;
  }

  return {
    ...storyboard,
    captions,
  };
};
