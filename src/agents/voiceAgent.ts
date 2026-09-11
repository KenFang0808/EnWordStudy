import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Storyboard } from "../models/storyboard.ts";
import { VIDEO_DEFAULTS } from "../models/video.ts";
import { PATHS } from "../utils/assets.ts";
import { getLocalAudioDurationSeconds, requireCommand } from "../utils/audio.ts";
import { getEnv } from "../utils/env.ts";
import { getStoryboardDurationInSeconds } from "../utils/duration.ts";

const TAIL_SECONDS = 0.3;
const DEFAULT_SAY_VOICE = "Samantha";
const DEFAULT_SAY_RATE = "170";
const INDEX_TTS_DEFAULT_ROOT = "/Users/bytedance/index-tts";
const INDEX_TTS_DEFAULT_DEVICE = "mps";
const FISH_DEFAULT_MODEL = "s2-pro";
const FISH_DEFAULT_SPEED = 1;
const FISH_DEFAULT_TEMPERATURE = 0.7;
const FISH_DEFAULT_TOP_P = 0.7;
const FISH_DEFAULT_LATENCY = "normal";
const ELEVENLABS_DEFAULT_MODEL = "eleven_multilingual_v2";
const ELEVENLABS_DEFAULT_STABILITY = 0.45;
const ELEVENLABS_DEFAULT_SIMILARITY_BOOST = 0.8;
const ELEVENLABS_DEFAULT_STYLE = 0.2;

const parseNumberEnv = (name: string, fallback: number): number => {
  const raw = getEnv(name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveIndexTtsRoot = (): string =>
  getEnv("INDEX_TTS_ROOT") ?? INDEX_TTS_DEFAULT_ROOT;

const resolveIndexTtsPython = (root: string): string => {
  const configured = getEnv("INDEX_TTS_PYTHON");
  if (configured) {
    return configured;
  }

  const bundled = join(root, ".venv", "bin", "python");
  return existsSync(bundled) ? bundled : "python3";
};

const resolveIndexTtsVoice = (root: string): string =>
  getEnv("INDEX_TTS_VOICE") ?? join(root, "examples", "voice_01.wav");

const mapIndexTtsLanguage = (language: string): string => {
  const normalized = language.trim().toLowerCase();
  if (
    normalized === "zh" ||
    normalized === "zh-cn" ||
    normalized === "zh-hans" ||
    normalized === "cn"
  ) {
    return "ZH";
  }
  if (
    normalized === "en" ||
    normalized === "en-us" ||
    normalized === "en-gb"
  ) {
    return "EN";
  }
  if (normalized === "ja" || normalized === "ja-jp" || normalized === "jp") {
    return "JA";
  }
  if (
    normalized === "es" ||
    normalized === "es-es" ||
    normalized === "es-mx"
  ) {
    return "ES";
  }
  if (normalized === "ar" || normalized === "ar-sa") {
    return "AR";
  }

  throw new Error(`IndexTTS does not support language "${language}".`);
};

const convertWavToMp3 = (inputPath: string, outputPath: string): void => {
  requireCommand("ffmpeg");
  execFileSync(
    "ffmpeg",
    ["-y", "-i", inputPath, "-ar", "44100", "-ac", "1", "-b:a", "128k", outputPath],
    { stdio: "pipe" },
  );
};

const synthesizeWithIndexTTS = (
  narration: string,
  outputPath: string,
  language: string,
): void => {
  const root = resolveIndexTtsRoot();
  const scriptPath = join(root, "generate_audio.py");
  const modelDir = getEnv("INDEX_TTS_MODEL_DIR") ?? join(root, "checkpoints");
  const voicePath = resolveIndexTtsVoice(root);
  const pythonPath = resolveIndexTtsPython(root);
  const device = getEnv("INDEX_TTS_DEVICE") ?? INDEX_TTS_DEFAULT_DEVICE;
  const durationFactor = getEnv("INDEX_TTS_DURATION_FACTOR");
  const wavOutputPath = join(tmpdir(), `ai-video-index-tts-${Date.now()}.wav`);
  const cacheRoot = join(tmpdir(), "ai-video-index-tts-cache");

  if (!existsSync(root)) {
    throw new Error(`IndexTTS root does not exist: ${root}`);
  }
  if (!existsSync(scriptPath)) {
    throw new Error(`IndexTTS wrapper is missing: ${scriptPath}`);
  }
  if (!existsSync(voicePath)) {
    throw new Error(`IndexTTS voice prompt is missing: ${voicePath}`);
  }

  const args = [
    scriptPath,
    "--text",
    narration,
    "--lang",
    mapIndexTtsLanguage(language),
    "--voice",
    voicePath,
    "--output",
    wavOutputPath,
    "--model-dir",
    modelDir,
    "--device",
    device,
    "--force",
  ];
  if (device === "cpu" || device === "mps") {
    args.push("--no-bf16");
  }
  if (durationFactor) {
    args.push("--duration-factor", durationFactor);
  }

  execFileSync(pythonPath, args, {
    cwd: root,
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
      PYTHONPYCACHEPREFIX: join(cacheRoot, "pycache"),
      NUMBA_CACHE_DIR: join(cacheRoot, "numba"),
    },
    stdio: "pipe",
  });
  convertWavToMp3(wavOutputPath, outputPath);
};

const synthesizeWithOpenAI = async (
  narration: string,
  outputPath: string,
): Promise<void> => {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "nova",
      input: narration,
      format: "mp3",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI TTS failed (${response.status}): ${await response.text()}`,
    );
  }

  writeFileSync(outputPath, new Uint8Array(await response.arrayBuffer()));
};

const synthesizeWithFishAudio = async (
  narration: string,
  outputPath: string,
): Promise<void> => {
  const apiKey = getEnv("FISH_API_KEY");
  if (!apiKey) {
    throw new Error("FISH_API_KEY is missing.");
  }

  const response = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: getEnv("FISH_MODEL") ?? FISH_DEFAULT_MODEL,
    },
    body: JSON.stringify({
      text: narration,
      reference_id: getEnv("FISH_REFERENCE_ID") || undefined,
      temperature: parseNumberEnv("FISH_TEMPERATURE", FISH_DEFAULT_TEMPERATURE),
      top_p: parseNumberEnv("FISH_TOP_P", FISH_DEFAULT_TOP_P),
      prosody: {
        speed: parseNumberEnv("FISH_SPEED", FISH_DEFAULT_SPEED),
      },
      latency: getEnv("FISH_LATENCY") ?? FISH_DEFAULT_LATENCY,
      normalize: true,
      format: "mp3",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Fish Audio TTS failed (${response.status}): ${await response.text()}`,
    );
  }

  writeFileSync(outputPath, new Uint8Array(await response.arrayBuffer()));
};

const synthesizeWithElevenLabs = async (
  narration: string,
  outputPath: string,
): Promise<void> => {
  const apiKey = getEnv("ELEVENLABS_API_KEY");
  const voiceId = getEnv("ELEVENLABS_VOICE_ID");
  const modelId = getEnv("ELEVENLABS_MODEL_ID") ?? ELEVENLABS_DEFAULT_MODEL;
  if (!apiKey || !voiceId) {
    throw new Error("ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID is missing.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: narration,
        model_id: modelId,
        voice_settings: {
          stability: parseNumberEnv(
            "ELEVENLABS_STABILITY",
            ELEVENLABS_DEFAULT_STABILITY,
          ),
          similarity_boost: parseNumberEnv(
            "ELEVENLABS_SIMILARITY_BOOST",
            ELEVENLABS_DEFAULT_SIMILARITY_BOOST,
          ),
          style: parseNumberEnv("ELEVENLABS_STYLE", ELEVENLABS_DEFAULT_STYLE),
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `ElevenLabs TTS failed (${response.status}): ${await response.text()}`,
    );
  }

  writeFileSync(outputPath, new Uint8Array(await response.arrayBuffer()));
};

const synthesizeWithMacSay = (narration: string, outputPath: string): void => {
  requireCommand("say");
  requireCommand("ffmpeg");
  const textPath = join(tmpdir(), `ai-video-narration-${Date.now()}.txt`);
  const aiffPath = join(tmpdir(), `ai-video-narration-${Date.now()}.aiff`);
  writeFileSync(textPath, narration, "utf8");
  execFileSync(
    "say",
    ["-v", DEFAULT_SAY_VOICE, "-r", DEFAULT_SAY_RATE, "-f", textPath, "-o", aiffPath],
    {
      stdio: "pipe",
    },
  );
  execFileSync(
    "ffmpeg",
    ["-y", "-i", aiffPath, "-ar", "44100", "-ac", "1", "-b:a", "128k", outputPath],
    { stdio: "pipe" },
  );
};

const synthesizeScene = async (
  narration: string,
  outputPath: string,
  language: string,
): Promise<string> => {
  if (getEnv("ELEVENLABS_API_KEY") && getEnv("ELEVENLABS_VOICE_ID")) {
    try {
      await synthesizeWithElevenLabs(narration, outputPath);
      return "elevenlabs";
    } catch (error) {
      console.warn(
        `Voice Agent: ElevenLabs TTS failed (${error instanceof Error ? error.message : String(error)}). Falling back to other providers.`,
      );
    }
  }

  if (getEnv("FISH_API_KEY")) {
    try {
      await synthesizeWithFishAudio(narration, outputPath);
      return "fish-audio";
    } catch (error) {
      console.warn(
        `Voice Agent: Fish Audio TTS failed (${error instanceof Error ? error.message : String(error)}). Falling back to other providers.`,
      );
    }
  }

  if (getEnv("OPENAI_API_KEY")) {
    try {
      await synthesizeWithOpenAI(narration, outputPath);
      return "openai";
    } catch (error) {
      console.warn(
        `Voice Agent: OpenAI TTS failed (${error instanceof Error ? error.message : String(error)}). Falling back to macOS say.`,
      );
    }
  }

  try {
    synthesizeWithIndexTTS(narration, outputPath, language);
    return "index-tts";
  } catch (error) {
    console.warn(
      `Voice Agent: IndexTTS failed (${error instanceof Error ? error.message : String(error)}). Falling back to macOS say.`,
    );
  }

  synthesizeWithMacSay(narration, outputPath);
  return "macos-say";
};

export const generateVoice = async (
  storyboard: Storyboard,
): Promise<Storyboard> => {
  mkdirSync(join(process.cwd(), PATHS.voiceDir), { recursive: true });
  let provider = "";

  const scenes = [];
  for (const scene of storyboard.scenes) {
    if (scene.narration.trim().length === 0) {
      throw new Error(`Voice Agent: scene "${scene.id}" is missing narration.`);
    }

    console.log(`Voice Agent: synthesizing ${scene.id}...`);
    const relativeFile = `${PATHS.voiceDir}/${scene.id}.mp3`.replace(
      /^public\//,
      "",
    );
    const absoluteFile = join(process.cwd(), PATHS.voiceDir, `${scene.id}.mp3`);
    provider = await synthesizeScene(
      scene.narration,
      absoluteFile,
      storyboard.language,
    );
    const audioDurationSeconds = getLocalAudioDurationSeconds(absoluteFile);
    const targetDurationSeconds = audioDurationSeconds + TAIL_SECONDS;
    scenes.push({
      ...scene,
      voiceoverFile: relativeFile,
      audioDurationSeconds,
      durationInSeconds:
        scene.type === "outro"
          ? targetDurationSeconds
          : Math.max(scene.durationInSeconds, targetDurationSeconds),
    });
    console.log(
      `Voice Agent: finished ${scene.id} (${audioDurationSeconds.toFixed(2)}s)`,
    );
  }

  console.log(`Voice Agent: using ${provider}`);

  const withVoice = {
    ...storyboard,
    voiceoverFile: null,
    scenes,
  };

  const last = withVoice.scenes[withVoice.scenes.length - 1];
  const composed = getStoryboardDurationInSeconds(withVoice);
  if (last && composed < VIDEO_DEFAULTS.minDurationSeconds) {
    last.durationInSeconds +=
      VIDEO_DEFAULTS.minDurationSeconds - composed + 1;
  }

  return withVoice;
};
