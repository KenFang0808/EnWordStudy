import type { CaptionCue, Storyboard } from "../models/storyboard.ts";
import { getSceneStartSeconds, getStoryboardDurationInSeconds } from "../utils/duration.ts";

const MAX_WORDS_PER_CUE = 8;

const chunkNarration = (text: string): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += MAX_WORDS_PER_CUE) {
    chunks.push(words.slice(index, index + MAX_WORDS_PER_CUE).join(" "));
  }

  return chunks.length > 0 ? chunks : [text];
};

export const generateCaptions = (storyboard: Storyboard): Storyboard => {
  const starts = getSceneStartSeconds(storyboard);
  const captions: CaptionCue[] = [];

  storyboard.scenes.forEach((scene, index) => {
    const chunks = chunkNarration(scene.narration);
    const sceneStartMs = Math.round(starts[index] * 1000);
    const usableMs = Math.max(
      800,
      Math.round((scene.audioDurationSeconds ?? scene.durationInSeconds * 0.9) * 1000),
    );
    const slice = Math.floor(usableMs / chunks.length);

    chunks.forEach((text, chunkIndex) => {
      const startMs = sceneStartMs + chunkIndex * slice;
      const endMs = sceneStartMs + (chunkIndex + 1) * slice;
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
