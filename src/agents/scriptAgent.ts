import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { VideoRequest } from "../models/input.ts";
import { scriptSchema, type Script } from "../models/script.ts";
import {
  vocabularyCatalogSchema,
  VOCABULARY_SECTION_IDS,
  type VocabularyEntry,
  type VocabularyStyle,
} from "../models/vocabulary.ts";
import { VIDEO_DEFAULTS } from "../models/video.ts";
import {
  findCopyQualityIssues,
  removeExampleRecap,
} from "../utils/copyQuality.ts";
import { getEnv } from "../utils/env.ts";
import { isChineseLanguage } from "../utils/text.ts";
import {
  countWords,
  estimateSpeakingDuration,
  targetWordCount,
} from "../utils/words.ts";

const MAX_REWRITE_ATTEMPTS = 3;

const vocabularyStyleFor = (request: VideoRequest): VocabularyStyle =>
  isChineseLanguage(request.language) ? "bilingual" : "en";

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
    sections: entry.sections.map((section) =>
      section.id === "examples"
        ? {
            ...section,
            narration: removeExampleRecap(section.narration),
          }
        : section,
    ),
    closing: entry.closing,
    wordCount: 0,
  };

  return validateScript(value, request);
};

const generateWithOpenAI = async (
  request: VideoRequest,
  previousIssues: string[] = [],
): Promise<Script> => {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const range = targetWordCount(request.duration);
  const bilingual = isChineseLanguage(request.language);
  const retryNote =
    previousIssues.length > 0
      ? `\n\nThe previous draft failed copy-quality checks: ${previousIssues.join(" ")} Rewrite the whole spoken lesson and fix every issue.`
      : "";
  const languageRule = bilingual
    ? `Write the explanations in Simplified Chinese. Keep the target word, its collocations, and all example sentences in English, and quote them inline inside the Chinese sentences. Never translate the example sentences.`
    : `Write everything in ${request.language}.`;
  const headings = bilingual
    ? ["理解核心含义", "掌握常见用法", "例句中学习", "避免常见混淆"]
    : [
        "Understand the meaning",
        "Know how people use it",
        "Learn it through examples",
        "Avoid common confusion",
      ];
  const hookRule = bilingual
    ? `hook: one Chinese sentence that names "${request.topic}" in English and states its most useful sense.`
    : `hook: one sentence in the form 'The word "${request.topic}" describes ...' that names the word and its most useful sense.`;
  const closingRule = bilingual
    ? `closing: two Chinese sentences that give a memory handle for "${request.topic}" and tell the learner when to use it.`
    : `closing: start with 'To remember "${request.topic},"' and end with a sentence that tells the learner when the word applies.`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getEnv("OPENAI_SCRIPT_MODEL") ?? "gpt-4o-mini",
      temperature: previousIssues.length > 0 ? 0.7 : 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: bilingual
            ? "You write spoken English vocabulary lessons for Chinese learners. Return JSON only and never invent an etymology."
            : "You write spoken English vocabulary lessons for learners. Return JSON only and never invent an etymology.",
        },
        {
          role: "user",
          content: `Write a spoken vocabulary lesson for the single word "${request.topic}" for ${request.audience}, lasting ${request.duration} seconds with at least ${range.min} narration words.

${languageRule}

Return JSON with: topic, language, audience, targetDurationSeconds, vocabulary, hook, sections, closing, wordCount.

vocabulary: word, IPA pronunciation, partOfSpeech, a concise definition, memoryHook, and 3 complete example sentences.

${hookRule}

sections: exactly 4 items in this order, each with heading, narration (2-4 spoken sentences), and 3 short points:
1. id "meaning", heading "${headings[0]}" - explain the core sense and nuance once; do not repeat the hook.
2. id "usage", heading "${headings[1]}" - teach natural collocations and one reusable sentence pattern.
3. id "examples", heading "${headings[2]}" - narrate 3 vivid 6-22 word example sentences from clearly different situations; each point is one complete sentence. Do not summarize them afterward.
4. id "contrast", heading "${headings[3]}" - compare it with one near-synonym and give a practical choice rule.

${closingRule}

Write like a concise human teacher, not a dictionary or template. Keep sentences short and use the target word in every section. Every scene must add new information. Vary transitions instead of repeating "For example / Another example / You can also say".${retryNote}`,
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
  const requestedStyle = vocabularyStyleFor(request);
  const entry = loadVocabularyCatalog().find(
    (item) =>
      item.word.toLowerCase() === request.topic.trim().toLowerCase() &&
      item.style === requestedStyle,
  );
  let previousIssues: string[] = [];

  if (entry) {
    console.log(
      `Script Agent: using the local vocabulary catalog (${requestedStyle})`,
    );
    const catalogScript = buildCatalogScript(request, entry);
    previousIssues = findCopyQualityIssues(catalogScript);
    if (previousIssues.length === 0) {
      return catalogScript;
    }

    console.warn(
      `Script Agent: catalog copy failed quality checks (${previousIssues.join(" ")}). Regenerating.`,
    );
  }

  if (!getEnv("OPENAI_API_KEY")) {
    if (previousIssues.length > 0) {
      throw new Error(
        `Catalog copy failed quality checks (${previousIssues.join(" ")}). Configure OPENAI_API_KEY to regenerate, or edit data/words/catalog.json.`,
      );
    }

    throw new Error(
      `No "${requestedStyle}" entry for "${request.topic}" in data/words/catalog.json. Add it or configure OPENAI_API_KEY.`,
    );
  }

  for (let attempt = 1; attempt <= MAX_REWRITE_ATTEMPTS; attempt += 1) {
    console.log(
      `Script Agent: generating vocabulary copy with OpenAI (attempt ${attempt}/${MAX_REWRITE_ATTEMPTS})`,
    );
    const script = await generateWithOpenAI(request, previousIssues);
    previousIssues = findCopyQualityIssues(script);
    if (previousIssues.length === 0) {
      return script;
    }

    console.warn(
      `Script Agent: generated copy failed quality checks (${previousIssues.join(" ")}). Retrying.`,
    );
  }

  throw new Error(
    `Could not generate engaging copy after ${MAX_REWRITE_ATTEMPTS} rewrites: ${previousIssues.join(" ")}`,
  );
};
