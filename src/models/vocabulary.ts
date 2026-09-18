import { z } from "zod";

export const VOCABULARY_SECTION_IDS = [
  "meaning",
  "usage",
  "examples",
  "contrast",
] as const;

export const vocabularyStyleSchema = z.enum(["en", "bilingual"]);

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
  style: vocabularyStyleSchema.default("en"),
  hook: z.string().min(1),
  sections: z.array(vocabularySectionSchema).length(4),
  closing: z.string().min(1),
});

export const vocabularyCatalogSchema = z
  .array(vocabularyEntrySchema)
  .superRefine((entries, context) => {
    const variants = new Set<string>();
    entries.forEach((entry, index) => {
      const key = `${entry.word.toLowerCase()}:${entry.style}`;
      if (variants.has(key)) {
        context.addIssue({
          code: "custom",
          path: [index, "style"],
          message: `Duplicate "${entry.style}" variant for "${entry.word}".`,
        });
      }
      variants.add(key);
    });
  });

export type VocabularyProfile = z.infer<typeof vocabularyProfileSchema>;
export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>;
export type VocabularyStyle = z.infer<typeof vocabularyStyleSchema>;
