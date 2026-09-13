export const countWords = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
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
