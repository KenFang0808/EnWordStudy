import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { VideoRequest } from "../models/input.ts";
import { scriptSchema, type Script } from "../models/script.ts";
import {
  vocabularyCatalogSchema,
  VOCABULARY_SECTION_IDS,
  type VocabularyEntry,
} from "../models/vocabulary.ts";
import { VIDEO_DEFAULTS } from "../models/video.ts";
import { getEnv } from "../utils/env.ts";
import {
  countWords,
  estimateSpeakingDuration,
  targetWordCount,
} from "../utils/words.ts";

const parseJsonObject = (text: string): unknown => {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Script Agent did not return JSON.");
  }

  return JSON.parse(raw.slice(start, end + 1)) as unknown;
};

const narrationText = (script: Script): string =>
  [
    script.hook,
    ...script.sections.map((section) => section.narration),
    script.closing,
  ].join(" ");

const validateScript = (value: unknown, request: VideoRequest): Script => {
  const parsed = scriptSchema.safeParse(value);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Vocabulary script JSON is invalid: ${details}`);
  }

  const wordCount = countWords(narrationText(parsed.data));
  const script = {
    ...parsed.data,
    wordCount,
    targetDurationSeconds: Math.min(
      VIDEO_DEFAULTS.maxDurationSeconds,
      Math.max(
        VIDEO_DEFAULTS.minDurationSeconds,
        Math.round(estimateSpeakingDuration(wordCount)),
      ),
    ),
  };
  const requestedWord = request.topic.trim().toLowerCase();
  if (
    script.topic.trim().toLowerCase() !== requestedWord ||
    script.vocabulary.word.toLowerCase() !== requestedWord
  ) {
    throw new Error("Vocabulary script does not match the requested word.");
  }

  if (
    script.sections.length !== VOCABULARY_SECTION_IDS.length ||
    VOCABULARY_SECTION_IDS.some(
      (id, index) => script.sections[index]?.id !== id,
    )
  ) {
    throw new Error(
      `Vocabulary script sections must be: ${VOCABULARY_SECTION_IDS.join(", ")}.`,
    );
  }

  const minimumWords = targetWordCount(
    VIDEO_DEFAULTS.minDurationSeconds,
  ).min;
  const maximumWords = targetWordCount(
    VIDEO_DEFAULTS.maxDurationSeconds,
  ).max;
  if (script.wordCount < minimumWords || script.wordCount > maximumWords) {
    throw new Error(
      `Vocabulary script has ${script.wordCount} words; expected ${minimumWords}-${maximumWords} words for a ${VIDEO_DEFAULTS.minDurationSeconds}-${VIDEO_DEFAULTS.maxDurationSeconds}s video.`,
    );
  }

  return script;
};

const loadVocabularyCatalog = (): VocabularyEntry[] => {
  const file = join(process.cwd(), "data/words/catalog.json");
  const parsed = vocabularyCatalogSchema.safeParse(
    JSON.parse(readFileSync(file, "utf8")) as unknown,
  );
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Vocabulary catalog is invalid: ${details}`);
  }

  return parsed.data;
};

const buildCatalogScript = (
  request: VideoRequest,
  entry: VocabularyEntry,
): Script => {
  const value = {
    topic: request.topic,
    language: request.language,
    audience: request.audience,
    targetDurationSeconds: request.duration,
    vocabulary: {
      word: entry.word,
      pronunciation: entry.pronunciation,
      partOfSpeech: entry.partOfSpeech,
      definition: entry.definition,
      memoryHook: entry.memoryHook,
      examples: entry.examples,
    },
    hook: entry.hook,
    sections: entry.sections,
    closing: entry.closing,
    wordCount: 0,
  };

  return validateScript(value, request);
};

const generateWithOpenAI = async (request: VideoRequest): Promise<Script> => {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const range = targetWordCount(request.duration);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getEnv("OPENAI_SCRIPT_MODEL") ?? "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write spoken English vocabulary lessons for learners. Return JSON only and never invent an etymology.",
        },
        {
          role: "user",
          content: `Write a spoken vocabulary lesson for the single word "${request.topic}" in ${request.language} for ${request.audience}, lasting ${request.duration} seconds with at least ${range.min} narration words.

Return JSON with: topic, language, audience, targetDurationSeconds, vocabulary, hook, sections, closing, wordCount.

vocabulary: word, IPA pronunciation, partOfSpeech, a concise definition, memoryHook, and 3 complete example sentences.

hook: one sentence in the form 'The word "${request.topic}" describes ...'.

sections: exactly 4 items in this order, each with heading, narration (2-4 spoken sentences), and 3 short points:
1. id "meaning", heading "Understand the meaning" - explain the core sense and nuance.
2. id "usage", heading "Know how people use it" - explain natural collocations and patterns.
3. id "examples", heading "Learn it through examples" - narrate 3 complete example sentences; each point is one short complete sentence using the word.
4. id "contrast", heading "Avoid common confusion" - compare it with a near-synonym and explain the difference.

closing: start with 'To remember "${request.topic},"' and end with a sentence that tells the learner when the word applies.

Write natural spoken English, keep sentences short, and use the target word in every section.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI vocabulary generation failed (${response.status}): ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty vocabulary script.");
  }

  return validateScript(parseJsonObject(content), request);
};

export const generateScript = async (request: VideoRequest): Promise<Script> => {
  const entry = loadVocabularyCatalog().find(
    (item) => item.word.toLowerCase() === request.topic.trim().toLowerCase(),
  );
  if (entry) {
    console.log("Script Agent: using the local vocabulary catalog");
    return buildCatalogScript(request, entry);
  }

  if (getEnv("OPENAI_API_KEY")) {
    console.log("Script Agent: using OpenAI vocabulary generation");
    return generateWithOpenAI(request);
  }

  throw new Error(
    `No entry for "${request.topic}" in data/words/catalog.json. Add it or configure OPENAI_API_KEY.`,
  );
};
