const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "procrastinate" has to match "procrastinated" and "procrastinating", so the
// inflected forms are spelled out instead of matching the base form only.
const wordFamilySource = (word: string): string => {
  const escaped = escapeRegExp(word);
  const variants = [`${escaped}(?:s|es|ed|d|ing)?`];
  if (word.endsWith("e") && word.length > 5) {
    variants.push(`${escapeRegExp(word.slice(0, -1))}(?:ed|ing)`);
  }
  if (word.endsWith("y") && word.length > 3) {
    variants.push(`${escapeRegExp(word.slice(0, -1))}(?:ies|ied)`);
  }
  if (word.endsWith("ion") && word.length > 6) {
    variants.push(`${escapeRegExp(word.slice(0, -3))}[a-z]*`);
  }

  return `(?:${variants.join("|")})`;
};

export const getWordFamilyPattern = (word: string): RegExp =>
  new RegExp(`\\b${wordFamilySource(word)}\\b`, "i");

export const getWordFamilySplitPattern = (word: string): RegExp =>
  new RegExp(`\\b(${wordFamilySource(word)})\\b`, "gi");

export const isWordFamilyForm = (value: string, word: string): boolean =>
  new RegExp(`^${wordFamilySource(word)}$`, "i").test(value);
