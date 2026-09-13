import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const file = option("file") ?? "data/words.txt";
const duration = option("duration") ?? "90";
const language = option("language") ?? "en";
const style = option("style") ?? "vocabulary-cinematic";
const audience = option("audience") ?? "English learners";
const dryRun = args.includes("--dry-run");
const words = readFileSync(resolve(file), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim().toLowerCase())
  .filter((line) => line.length > 0 && !line.startsWith("#"));

if (words.length === 0) {
  throw new Error(`No vocabulary words found in ${file}.`);
}

const failures: Array<{ word: string; message: string }> = [];
for (const [index, word] of words.entries()) {
  console.log(`\n[${index + 1}/${words.length}] Generating "${word}"`);
  if (dryRun) {
    continue;
  }
  try {
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--experimental-default-type=module",
        "src/pipeline/generateVideo.ts",
        word,
        "--duration",
        duration,
        "--language",
        language,
        "--style",
        style,
        "--audience",
        audience,
      ],
      { cwd: process.cwd(), stdio: "inherit" },
    );
  } catch (error) {
    failures.push({
      word,
      message: error instanceof Error ? error.message : String(error),
    });
    console.error(`Batch: "${word}" failed; continuing with the next word.`);
  }
}

console.log(
  `\nBatch complete: ${words.length - failures.length} succeeded, ${failures.length} failed.`,
);
if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`- ${failure.word}: ${failure.message}`);
  }
  process.exitCode = 1;
}
