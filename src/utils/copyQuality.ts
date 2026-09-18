import type { Script } from "../models/script.ts";
import { hasCjkCharacters, splitClauses, splitSentences } from "./text.ts";
import { getWordFamilyPattern } from "./wordFamily.ts";
import { countWords } from "./words.ts";

const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "also",
  "an",
  "and",
  "as",
  "be",
  "but",
  "can",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "like",
  "may",
  "might",
  "more",
  "most",
  "much",
  "not",
  "of",
  "often",
  "on",
  "or",
  "our",
  "over",
  "should",
  "so",
  "someone",
  "something",
  "such",
  "than",
  "that",
  "the",
  "their",
  "then",
  "they",
  "this",
  "to",
  "under",
  "very",
  "we",
  "when",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

const EXAMPLE_FILLER =
  /\b(these examples show|this example shows|as these examples|the examples above)\b/i;

export const removeExampleRecap = (text: string): string =>
  text
    .replace(
      /\s+(?:these examples show|this example shows|as these examples|the examples above)\b[\s\S]*$/i,
      "",
    )
    .trim();

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim();

const contentTokens = (text: string, word: string): string[] =>
  normalizeText(text)
    .split(" ")
    .filter(
      (token) =>
        Boolean(token) &&
        token !== word &&
        token.length > 2 &&
        !STOP_WORDS.has(token),
    );

const ngrams = (tokens: string[], size: number): string[] => {
  if (tokens.length < size) {
    return [];
  }

  const grams: string[] = [];
  for (let index = 0; index <= tokens.length - size; index += 1) {
    grams.push(tokens.slice(index, index + size).join(" "));
  }

  return grams;
};

const latinWordsIn = (text: string): string[] =>
  text
    .replace(/[^a-zA-Z-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

const cjkOnly = (text: string): string =>
  (text.match(/[\u3400-\u9fff]+/g) ?? []).join("");

const findTranslatedContrastTerms = (script: Script): string[] => {
  const contrast = script.sections.find((section) => section.id === "contrast");
  if (!contrast || !hasCjkCharacters(contrast.narration)) {
    return [];
  }

  const word = script.vocabulary.word.toLowerCase();
  const clauses = splitClauses(contrast.narration);
  const issues: string[] = [];

  for (const point of contrast.points ?? []) {
    const terms = latinWordsIn(point).filter((token) => token !== word);
    const chinese = cjkOnly(point);
    if (terms.length === 0 || chinese.length < 2) {
      continue;
    }

    for (const clause of clauses) {
      if (!cjkOnly(clause).includes(chinese)) {
        continue;
      }
      if (terms.some((term) => latinWordsIn(clause).includes(term))) {
        continue;
      }
      issues.push(
        `contrast translates "${terms[0]}" into Chinese instead of keeping the English word`,
      );
    }
  }

  return [...new Set(issues)];
};

const teachingNarrations = (
  script: Script,
): Array<{ id: string; text: string }> => [
  { id: "hook", text: script.hook },
  ...script.sections
    .filter((section) => section.id !== "examples")
    .map((section) => ({ id: section.id, text: section.narration })),
];

export const findCopyQualityIssues = (script: Script): string[] => {
  const word = script.vocabulary.word.toLowerCase();
  const issues: string[] = [];
  const teaching = teachingNarrations(script);
  const phraseScenes = new Map<string, Set<string>>();

  for (const part of teaching) {
    for (const phrase of ngrams(contentTokens(part.text, word), 3)) {
      const scenes = phraseScenes.get(phrase) ?? new Set<string>();
      scenes.add(part.id);
      phraseScenes.set(phrase, scenes);
    }
  }

  const repeatedPhrases = [...phraseScenes.entries()]
    .filter(([, scenes]) => scenes.size >= 2)
    .map(
      ([phrase, scenes]) =>
        `"${phrase}" in ${[...scenes].join(" and ")}`,
    );

  if (repeatedPhrases.length > 0) {
    issues.push(
      `lesson copy repeats the same idea across scenes: ${repeatedPhrases.join("; ")}`,
    );
  }

  const sentences = [
    script.hook,
    ...script.sections.map((section) => section.narration),
    script.closing,
  ]
    .flatMap((text) => splitSentences(text))
    .map((sentence) => normalizeText(sentence))
    .filter((sentence) => countWords(sentence) >= 6);

  const seen = new Set<string>();
  for (const sentence of sentences) {
    if (seen.has(sentence)) {
      issues.push(`the same sentence is spoken more than once: "${sentence}"`);
      break;
    }
    seen.add(sentence);
  }

  const examples = script.sections.find((section) => section.id === "examples");
  if (examples && EXAMPLE_FILLER.test(examples.narration)) {
    issues.push(
      'the examples section restates the examples instead of letting the sentences teach the word',
    );
  }

  const targetPattern = getWordFamilyPattern(word);
  const normalizedExamples = new Set<string>();
  script.vocabulary.examples.forEach((example, index) => {
    const words = example.trim().split(/\s+/).filter(Boolean);
    if (words.length < 5 || words.length > 22) {
      issues.push(
        `example ${index + 1} should be a vivid 5-22 word sentence, but has ${words.length} words`,
      );
    }
    if (!targetPattern.test(example)) {
      issues.push(
        `example ${index + 1} does not use "${script.vocabulary.word}" or an inflected form`,
      );
    }
    if (!/[.!?]["']?$/.test(example.trim())) {
      issues.push(`example ${index + 1} is not a complete sentence`);
    }
    normalizedExamples.add(normalizeText(example));
  });
  if (normalizedExamples.size !== script.vocabulary.examples.length) {
    issues.push("the lesson contains duplicate example sentences");
  }

  const hookLength = countWords(script.hook);
  if (hookLength < 8 || hookLength > 30) {
    issues.push(
      `the hook should be concise (8-30 words), but has ${hookLength} words`,
    );
  }
  if (/^(welcome|in this video|today we(?:'|’)ll)/i.test(script.hook.trim())) {
    issues.push("the hook opens with generic video filler instead of the word");
  }

  issues.push(...findTranslatedContrastTerms(script));

  return issues;
};
