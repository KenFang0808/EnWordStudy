import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";

const lockPath = join(process.cwd(), "data/.generate.lock");

const isPidAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const readLockPid = (): number | undefined => {
  try {
    const pid = Number(readFileSync(lockPath, "utf8"));
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
};

// Voice files and data/storyboard.json are shared by every render. Two
// generates at once overwrite each other, so the second process has to stop
// before it writes anything.
export const acquireGenerateLock = (): void => {
  mkdirSync(dirname(lockPath), { recursive: true });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const fd = openSync(lockPath, "wx");
      writeSync(fd, String(process.pid));
      closeSync(fd);
      return;
    } catch (error) {
      const code =
        error instanceof Error && "code" in error ? error.code : undefined;
      if (code !== "EEXIST") {
        throw error;
      }

      const existingPid = readLockPid();
      if (
        existingPid !== undefined &&
        existingPid !== process.pid &&
        isPidAlive(existingPid)
      ) {
        throw new Error(
          `Another generate is already running (pid ${existingPid}). Wait for it to finish before starting another one.`,
        );
      }

      try {
        unlinkSync(lockPath);
      } catch {
        // The other process may have released the stale lock already.
      }
    }
  }

  throw new Error(
    "Could not acquire the generate lock. Another generate may be starting.",
  );
};

export const releaseGenerateLock = (): void => {
  if (readLockPid() !== process.pid) {
    return;
  }

  try {
    unlinkSync(lockPath);
  } catch {
    // The lock is already gone.
  }
};
