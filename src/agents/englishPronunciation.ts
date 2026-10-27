import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// These words were checked by ear. They win over the dictionary when the
// dictionary's first reading is not the one we want on screen.
const PRONUNCIATION_OVERRIDES: Record<string, string> = {
  coherent: "K OW0 . HH IH1 . R AH0 N T",
  coherently: "K OW0 . HH IH1 . R AH0 N T . L IY0",
  coherence: "K OW0 . HH IH1 . R AH0 N S",
  compelling: "K AH0 M . P EH1 . L IH0 NG",
  compel: "K AH0 M . P EH1 L",
  indispensable: "IH2 N . D IH0 . S P EH1 N . S AH0 . B AH0 L",
  indispensably: "IH2 N . D IH0 . S P EH1 N . S AH0 . B L IY0",
  profound: "P R AH0 . F AW1 N D",
  profoundly: "P R AH0 . F AW1 N D . L IY0",
  inevitable: "IH0 N . EH1 . V IH0 . T AH0 . B AH0 L",
  inevitably: "IH0 N . EH1 . V IH0 . T AH0 . B L IY0",
  intricate: "IH1 N . T R IH0 . K AH0 T",
  intricately: "IH1 N . T R IH0 . K AH0 T . L IY0",
  intricacy: "IH1 N . T R IH0 . K AH0 . S IY0",
  susceptible: "S AH0 . S EH1 P . T AH0 . B AH0 L",
  susceptibility: "S AH0 . S EH2 P . T AH0 . B IH1 . L AH0 . T IY0",
  unprecedented: "AH0 N . P R EH1 . S IH0 . D EH0 N . T IH0 D",
  unprecedentedly: "AH0 N . P R EH1 . S IH0 . D EH0 N . T IH0 D . L IY0",
};

const VOWEL_PHONE = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)[0-2]$/;

// Longest legal English onsets, written without separators. A consonant
// cluster between vowels stays with the following vowel only when the
// cluster is in this set.
const ONSETS = new Set([
  "P", "T", "K", "B", "D", "G", "F", "V", "S", "Z", "SH", "ZH", "TH", "DH",
  "HH", "M", "N", "L", "R", "W", "Y", "CH", "JH",
  "PL", "PR", "PY", "TR", "TW", "TY", "KL", "KR", "KW", "KY",
  "BL", "BR", "BY", "DR", "DW", "DY", "GL", "GR", "GW", "GY",
  "FL", "FR", "FY", "VY", "SL", "SM", "SN", "SW",
  "SHL", "SHR", "SHW", "THR", "THW",
  "SP", "ST", "SK",
  "SPL", "SPR", "SPY", "STR", "STY", "SKL", "SKR", "SKW", "SKY",
]);

const INFLECTION_SUFFIXES = [
  "ability",
  "ibility",
  "ation",
  "tion",
  "sion",
  "ence",
  "ance",
  "ness",
  "ment",
  "ity",
  "ies",
  "ied",
  "ing",
  "ible",
  "able",
  "ely",
  "ize",
  "ise",
  "ly",
  "ed",
  "es",
  "er",
  "est",
  "ate",
  "ent",
  "ant",
  "al",
  "y",
  "s",
];

const CMUDICT_PATH = join(process.cwd(), "src/data/cmudict.dict");

let dictionary: Map<string, string[]> | null = null;

const phoneBase = (phone: string): string => phone.replace(/[0-2]$/, "");

export const syllabifyArpabet = (phones: readonly string[]): string => {
  const vowelIndexes: number[] = [];
  phones.forEach((phone, index) => {
    if (VOWEL_PHONE.test(phone)) {
      vowelIndexes.push(index);
    }
  });
  if (vowelIndexes.length === 0) {
    return phones.join(" ");
  }

  const starts = vowelIndexes.map((vowelIndex, syllable) => {
    if (syllable === 0) {
      return 0;
    }
    const previousVowel = vowelIndexes[syllable - 1] ?? 0;
    const consonants = phones.slice(previousVowel + 1, vowelIndex);
    let onsetLength = 0;
    for (let size = consonants.length; size > 0; size -= 1) {
      const candidate = consonants
        .slice(consonants.length - size)
        .map(phoneBase)
        .join("");
      if (ONSETS.has(candidate)) {
        onsetLength = size;
        break;
      }
    }
    return vowelIndex - onsetLength;
  });

  return starts
    .map((start, syllable) => {
      const end = starts[syllable + 1] ?? phones.length;
      return phones.slice(start, end).join(" ");
    })
    .join(" . ");
};

const loadDictionary = (): Map<string, string[]> => {
  if (dictionary) {
    return dictionary;
  }

  const loaded = new Map<string, string[]>();
  if (!existsSync(CMUDICT_PATH)) {
    console.warn(
      `Voice Agent: CMU dictionary is missing at ${CMUDICT_PATH}. Only hand-tuned pronunciations will be used.`,
    );
    dictionary = loaded;
    return loaded;
  }

  for (const line of readFileSync(CMUDICT_PATH, "utf8").split("\n")) {
    if (line.length === 0 || line.startsWith(";")) {
      continue;
    }
    const space = line.indexOf(" ");
    if (space <= 0) {
      continue;
    }
    const word = line
      .slice(0, space)
      .replace(/\(\d+\)$/, "")
      .toLowerCase();
    if (!/^[a-z]+$/.test(word) || loaded.has(word)) {
      continue;
    }
    loaded.set(word, line.slice(space + 1).trim().split(/\s+/));
  }

  dictionary = loaded;
  return loaded;
};

const stemWord = (word: string): string => {
  let stem = word;
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of INFLECTION_SUFFIXES) {
      if (!stem.endsWith(suffix) || stem.length - suffix.length < 4) {
        continue;
      }
      stem = stem.slice(0, -suffix.length);
      const last = stem.charAt(stem.length - 1);
      if (
        (suffix === "ing" || suffix === "ed") &&
        stem.length >= 2 &&
        last === stem.charAt(stem.length - 2)
      ) {
        stem = stem.slice(0, -1);
      }
      changed = true;
      break;
    }
  }
  return stem;
};

const stemKeys = (word: string): string[] => {
  const keys = new Set<string>();
  const add = (value: string) => {
    const stem = stemWord(value);
    if (stem.length >= 4) {
      keys.add(stem);
    }
  };
  add(word);
  // exacerbate + d/s/ing keeps or drops the final e: exacerbated, exacerbates, exacerbating.
  if (word.endsWith("ed")) {
    add(`${word.slice(0, -2)}e`);
  }
  if (word.endsWith("s")) {
    add(word.slice(0, -1));
  }
  if (word.endsWith("ing")) {
    add(`${word.slice(0, -3)}e`);
  }
  return [...keys];
};

const sameFamily = (topic: string, token: string): boolean => {
  if (token === topic) {
    return true;
  }
  const topicStems = new Set(stemKeys(topic));
  return stemKeys(token).some((stem) => topicStems.has(stem));
};

const dictionaryPronunciation = (word: string): string | null => {
  const phones = loadDictionary().get(word);
  if (!phones || phones.length === 0) {
    return null;
  }
  return syllabifyArpabet(phones);
};

// IndexTTS guesses English from spelling. Irregular stress and letter sounds
// are marked with CMU phonemes here. The annotation is sent only to TTS.
export const annotateSpokenPronunciations = (
  narration: string,
  topic: string,
): string => {
  const normalizedTopic = topic.trim().toLowerCase();
  const pronunciations = new Map<string, string>();
  const tokens = narration.match(/[A-Za-z]+/g) ?? [];

  for (const token of tokens) {
    const word = token.toLowerCase();
    if (pronunciations.has(word)) {
      continue;
    }
    const override = PRONUNCIATION_OVERRIDES[word];
    if (override) {
      pronunciations.set(word, override);
      continue;
    }
    if (!sameFamily(normalizedTopic, word)) {
      continue;
    }
    const fromDictionary = dictionaryPronunciation(word);
    if (fromDictionary) {
      pronunciations.set(word, fromDictionary);
    }
  }

  const words = [...pronunciations.keys()].sort(
    (left, right) => right.length - left.length,
  );
  let spoken = narration;
  for (const word of words) {
    const pronunciation = pronunciations.get(word);
    if (!pronunciation) {
      continue;
    }
    spoken = spoken.replace(
      new RegExp(`\\b${word}\\b`, "gi"),
      (match) => `<${match}|${pronunciation}>`,
    );
  }
  return spoken;
};
