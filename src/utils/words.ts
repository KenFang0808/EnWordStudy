import { countSpokenUnits } from "./text.ts";

export const countWords = (text: string): number => {
  return Math.round(countSpokenUnits(text));
};

export const targetWordCount = (durationSeconds: number): { min: number; max: number } => {
  return {
    min: Math.round((durationSeconds * 130) / 60),
    max: Math.round((durationSeconds * 160) / 60),
  };
};

export const estimateSpeakingDuration = (
  wordCount: number,
  wordsPerMinute = 145,
): number => {
  return (wordCount / wordsPerMinute) * 60;
};
