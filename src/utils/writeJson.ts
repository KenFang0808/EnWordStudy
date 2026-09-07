import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const writeJson = (relativePath: string, value: unknown): void => {
  const absolutePath = join(process.cwd(), relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
