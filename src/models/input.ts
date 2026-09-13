import { z } from "zod";
import { VIDEO_DEFAULTS } from "./video.ts";

export const videoRequestSchema = z.object({
  topic: z
    .string()
    .trim()
    .regex(
      /^[a-zA-Z-]+$/,
      "Topic must be one English vocabulary word (letters and hyphens only).",
    ),
  language: z.string().min(1).default(VIDEO_DEFAULTS.language),
  duration: z
    .number()
    .min(
      VIDEO_DEFAULTS.minDurationSeconds,
      `Duration must be at least ${VIDEO_DEFAULTS.minDurationSeconds} seconds.`,
    )
    .max(
      VIDEO_DEFAULTS.maxDurationSeconds,
      `Duration must be at most ${VIDEO_DEFAULTS.maxDurationSeconds} seconds.`,
    )
    .default(VIDEO_DEFAULTS.defaultDurationSeconds),
  style: z.string().min(1).default(VIDEO_DEFAULTS.style),
  audience: z.string().min(1).default("General"),
});

export type VideoRequest = z.infer<typeof videoRequestSchema>;
