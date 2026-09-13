import { z } from "zod";

export const VOCABULARY_SECTION_IDS = [
  "meaning",
  "usage",
  "examples",
  "contrast",
] as const;

export const vocabularyProfileSchema = z.object({
  word: z
    .string()
    .regex(/^[a-zA-Z-]+$/, "Vocabulary entries must be one English word."),
  pronunciation: z.string().min(1),
  partOfSpeech: z.string().min(1),
  definition: z.string().min(1),
  memoryHook: z.string().min(1),
  examples: z.array(z.string().min(1)).min(3),
});

const vocabularySectionSchema = z.object({
  id: z.enum(VOCABULARY_SECTION_IDS),
  heading: z.string().min(1),
  narration: z.string().min(1),
  points: z.array(z.string().min(1)).min(3),
});

export const vocabularyEntrySchema = vocabularyProfileSchema.extend({
  hook: z.string().min(1),
  sections: z.array(vocabularySectionSchema).length(4),
  closing: z.string().min(1),
});

export const vocabularyCatalogSchema = z.array(vocabularyEntrySchema);

export type VocabularyProfile = z.infer<typeof vocabularyProfileSchema>;
export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>;
