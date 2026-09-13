import { z } from "zod";

export const VIDEO_DEFAULTS = {
  width: 1080,
  height: 1920,
  fps: 30,
  minDurationSeconds: 60,
  defaultDurationSeconds: 90,
  maxDurationSeconds: 120,
  language: "en",
  style: "modern-tech",
  voiceVolume: 1,
  musicVolume: 0.08,
} as const;

export const aiVideoPropsSchema = z.object({
  showCaptions: z.boolean(),
});

export type AIVideoProps = z.infer<typeof aiVideoPropsSchema>;
