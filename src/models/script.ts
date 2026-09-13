import { z } from "zod";
import { vocabularyProfileSchema } from "./vocabulary.ts";

export const scriptSectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  narration: z.string().min(1),
  points: z.array(z.string().min(1)).optional(),
});

export const scriptSchema = z.object({
  topic: z.string().min(1),
  language: z.string().min(1),
  audience: z.string().min(1),
  targetDurationSeconds: z.number().positive(),
  vocabulary: vocabularyProfileSchema,
  hook: z.string().min(1),
  sections: z.array(scriptSectionSchema).min(1),
  closing: z.string().min(1),
  wordCount: z.number().int().nonnegative(),
});

export type ScriptSection = z.infer<typeof scriptSectionSchema>;
export type Script = z.infer<typeof scriptSchema>;
