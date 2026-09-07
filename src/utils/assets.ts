export const PATHS = {
  input: "data/input.json",
  script: "data/script.json",
  storyboard: "data/storyboard.json",
  voiceDir: "public/audio/voice",
  musicDir: "public/audio/music",
  imageDir: "public/images/generated",
  previewDir: "output/previews",
  finalDir: "output/final",
} as const;

export const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug.length > 0 ? slug : "video";
};
