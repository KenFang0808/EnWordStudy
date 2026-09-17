import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { PATHS, slugify } from "./assets.ts";
import { getEnv } from "./env.ts";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const voiceLabelFromPath = (voicePath: string): string => {
  const parts = voicePath.split("/").filter(Boolean);
  const presetsIndex = parts.findIndex(
    (part) => part.toLowerCase() === "presets",
  );
  if (presetsIndex >= 0 && parts[presetsIndex + 1]) {
    return slugify(parts[presetsIndex + 1]);
  }

  const fileName = basename(voicePath).replace(/\.[^.]+$/, "");
  const parent = basename(dirname(voicePath));
  if (parent && parent.toLowerCase() !== "examples") {
    return slugify(`${parent}-${fileName}`);
  }

  return slugify(fileName);
};

export const formatSpeedParam = (raw: string | undefined): string => {
  if (!raw) {
    return "default";
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return slugify(raw);
  }

  return `${String(parsed).replace(".", "p")}x`;
};

export const resolveVoiceLabel = (ttsProvider: string): string => {
  if (ttsProvider === "index-tts") {
    const voicePath = getEnv("INDEX_TTS_VOICE");
    if (voicePath) {
      return voiceLabelFromPath(voicePath);
    }

    return "index-tts";
  }

  if (ttsProvider === "elevenlabs") {
    return slugify(getEnv("ELEVENLABS_VOICE_ID") ?? "elevenlabs");
  }

  if (ttsProvider === "fish-audio") {
    return slugify(getEnv("FISH_REFERENCE_ID") ?? "fish");
  }

  if (ttsProvider === "openai") {
    return "openai-nova";
  }

  return slugify(ttsProvider);
};

export const buildOutputStem = (input: {
  topic: string;
  ttsProvider: string;
  durationFactor?: string;
}): string => {
  const word = slugify(input.topic);
  const voice = resolveVoiceLabel(input.ttsProvider);
  const speed = formatSpeedParam(
    input.durationFactor ?? getEnv("INDEX_TTS_DURATION_FACTOR"),
  );
  return `${word}-${voice}-${speed}`;
};

export const nextFinalOutputPath = (stem: string): string => {
  const directory = join(process.cwd(), PATHS.finalDir);
  mkdirSync(directory, { recursive: true });
  const pattern = new RegExp(`^${escapeRegExp(stem)}-v(\\d+)\\.mp4$`, "i");
  const versions = existsSync(directory)
    ? readdirSync(directory).flatMap((name) => {
        const match = name.match(pattern);
        return match ? [Number(match[1])] : [];
      })
    : [];
  const nextVersion = Math.max(0, ...versions) + 1;
  return `${PATHS.finalDir}/${stem}-v${nextVersion}.mp4`;
};
