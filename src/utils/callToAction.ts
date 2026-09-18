import { isChineseLanguage } from "./text.ts";

const OUTRO_CALL_TO_ACTIONS = {
  bilingual: "点个关注，单词立刻能用",
  en: "Follow me, take new words away",
} as const;

export const getOutroCallToAction = (language: string): string =>
  isChineseLanguage(language)
    ? OUTRO_CALL_TO_ACTIONS.bilingual
    : OUTRO_CALL_TO_ACTIONS.en;

const endsWithSentencePunctuation = (text: string): boolean =>
  /[.!?。！？]$/.test(text);

export const withOutroCallToAction = (
  teachingClose: string,
  language: string,
): string => {
  const close = teachingClose.trim();
  const callToAction = getOutroCallToAction(language);
  if (close.includes(callToAction)) {
    return close;
  }

  const punctuated = endsWithSentencePunctuation(close)
    ? close
    : `${close}${isChineseLanguage(language) ? "。" : "."}`;
  const ending = isChineseLanguage(language) ? "。" : ".";
  return `${punctuated} ${callToAction}${ending}`;
};
