import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export const requireCommand = (command: string): void => {
  try {
    execFileSync("which", [command], { stdio: "pipe" });
  } catch {
    throw new Error(
      `Required command "${command}" was not found on PATH. Install it and retry.`,
    );
  }
};

export const getLocalAudioDurationSeconds = (filePath: string): number => {
  if (!existsSync(filePath)) {
    throw new Error(`Audio file is missing: ${filePath}`);
  }

  requireCommand("ffprobe");
  const output = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8" },
  ).trim();

  const duration = Number.parseFloat(output);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not measure duration for ${filePath}: "${output}"`);
  }

  return duration;
};
