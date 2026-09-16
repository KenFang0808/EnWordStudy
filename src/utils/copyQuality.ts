import type { Script } from "../models/script.ts";

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

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
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

const teachingNarrations = (
  script: Script,
): Array<{ id: string; text: string }> => [
  { id: "hook", text: script.hook },
  ...script.sections
    .filter((section) => section.id !== "examples")
    .map((section) => ({ id: section.id, text: section.narration })),
];

export const findRepetitiveCopyIssues = (script: Script): string[] => {
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
    .flatMap((text) => text.split(/(?<=[.!?])\s+/))
    .map((sentence) => normalizeText(sentence))
    .filter((sentence) => sentence.split(" ").length >= 6);

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

  return issues;
};
