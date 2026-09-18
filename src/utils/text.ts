// Chinese explanations carry no spaces and end on full-width punctuation, so
// text helpers cannot assume the English "split on spaces and .!?" rules.
const CJK_CHARACTER = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
const SENTENCE_BOUNDARY = /(?<=[.!?。！？])\s*/;
const CLAUSE_BOUNDARY = /[^,;:，、；：]+[,;:，、；：]?/g;

// A Chinese character takes roughly half the time of an English word to speak,
// so weight it that way to keep duration estimates comparable across styles.
const CJK_UNITS_PER_CHARACTER = 0.55;

export const countCjkCharacters = (text: string): number =>
  text.match(CJK_CHARACTER)?.length ?? 0;

export const hasCjkCharacters = (text: string): boolean =>
  countCjkCharacters(text) > 0;

export const isChineseLanguage = (language: string): boolean =>
  /^(zh|cn)/i.test(language.trim()) || hasCjkCharacters(language);

export const splitSentences = (text: string): string[] =>
  text
    .trim()
    .split(SENTENCE_BOUNDARY)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

export const splitClauses = (text: string): string[] =>
  text.match(CLAUSE_BOUNDARY)?.map((clause) => clause.trim()).filter(Boolean) ??
  [];

export const countSpokenUnits = (text: string): number => {
  const cjkCharacters = countCjkCharacters(text);
  const latinWords = text
    .replace(CJK_CHARACTER, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word)).length;

  return latinWords + cjkCharacters * CJK_UNITS_PER_CHARACTER;
};
