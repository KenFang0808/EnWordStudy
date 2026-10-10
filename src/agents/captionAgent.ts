import type { CaptionCue, Storyboard } from "../models/storyboard.ts";
import { getSceneStartSeconds, getStoryboardDurationInSeconds } from "../utils/duration.ts";
import { splitClauses, splitSentences } from "../utils/text.ts";
import { countWords } from "../utils/words.ts";

const MAX_WORDS_PER_CUE = 16;

const normalizeText = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").trim();

const splitByUnitBudget = (sentence: string): string[] => {
  const words = sentence.split(/\s+/).filter(Boolean);
  // Chinese runs contain no spaces, so fall back to slicing characters.
  if (words.length === 1) {
    const characters = [...sentence];
    const perChunk = Math.max(
      1,
      Math.ceil(characters.length / Math.ceil(countWords(sentence) / MAX_WORDS_PER_CUE)),
    );
    const chunks: string[] = [];
    for (let index = 0; index < characters.length; index += perChunk) {
      chunks.push(characters.slice(index, index + perChunk).join(""));
    }

    return chunks;
  }

  const chunks: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    current.push(word);
    if (countWords(current.join(" ")) >= MAX_WORDS_PER_CUE) {
      chunks.push(current.join(" "));
      current = [];
    }
  }
  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  return chunks;
};

const chunkNarration = (text: string): string[] => {
  const sentences = splitSentences(text);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    if (countWords(sentence) <= MAX_WORDS_PER_CUE) {
      chunks.push(sentence);
      continue;
    }

    const clauses = splitClauses(sentence);
    if (
      clauses.length > 1 &&
      clauses.every((clause) => countWords(clause) <= MAX_WORDS_PER_CUE)
    ) {
      chunks.push(...clauses);
      continue;
    }

    chunks.push(...splitByUnitBudget(sentence));
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
      (sum, chunk) => sum + countWords(chunk),
      0,
    );
    let elapsedMs = 0;

    chunks.forEach((text, chunkIndex) => {
      const startMs = sceneStartMs + elapsedMs;
      const isLast = chunkIndex === chunks.length - 1;
      const durationMs = isLast
        ? usableMs - elapsedMs
        : Math.round(
            (countWords(text) / Math.max(1, totalWords)) * usableMs,
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
