import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Storyboard } from "../models/storyboard.ts";
import { PATHS } from "../utils/assets.ts";
import { requireCommand } from "../utils/audio.ts";
import { getStoryboardDurationInSeconds } from "../utils/duration.ts";
import { VIDEO_DEFAULTS } from "../models/video.ts";

export const generateMusic = (storyboard: Storyboard): Storyboard => {
  requireCommand("ffmpeg");
  mkdirSync(join(process.cwd(), PATHS.musicDir), { recursive: true });

  const duration = Math.max(
    VIDEO_DEFAULTS.minDurationSeconds,
    getStoryboardDurationInSeconds(storyboard) + 2,
  );
  const fadeOutStart = Math.max(duration - 2.5, 0);
  const relativeFile = "audio/music/background.mp3";
  const absoluteFile = join(process.cwd(), PATHS.musicDir, "background.mp3");

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anoisesrc=color=pink:amplitude=0.08:sample_rate=44100",
      "-f",
      "lavfi",
      "-i",
      "anoisesrc=color=brown:amplitude=0.03:sample_rate=44100",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=392:sample_rate=44100",
      "-filter_complex",
      [
        "[0:a]highpass=f=180,lowpass=f=2200,volume=0.18[a0]",
        "[1:a]highpass=f=45,lowpass=f=160,volume=0.05[a1]",
        "[2:a]lowpass=f=600,volume=0.008[a2]",
        `[a0][a1][a2]amix=inputs=3:duration=longest,` +
          `afade=t=in:st=0:d=1.5,` +
          `afade=t=out:st=${fadeOutStart.toFixed(2)}:d=2.5,` +
          "alimiter=limit=0.08",
      ].join(";"),
      "-t",
      duration.toFixed(2),
      "-ac",
      "2",
      "-b:a",
      "128k",
      absoluteFile,
    ],
    { stdio: "pipe" },
  );

  return {
    ...storyboard,
    musicFile: relativeFile,
    musicVolume: VIDEO_DEFAULTS.musicVolume,
  };
};
