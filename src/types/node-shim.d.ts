declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: string): string;
  export function writeFileSync(
    path: string,
    data: string | Uint8Array,
    encoding?: string,
  ): void;
  export function mkdirSync(
    path: string,
    options?: { recursive?: boolean },
  ): void;
  export function statSync(path: string): { size: number };
}

declare module "node:path" {
  export function join(...parts: string[]): string;
  export function dirname(path: string): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:child_process" {
  export function execFileSync(
    file: string,
    args?: readonly string[],
    options?: {
      stdio?: "pipe" | "inherit" | Array<"pipe" | "inherit" | "ignore">;
      encoding?: string;
      cwd?: string;
    },
  ): string;
}

declare const process: {
  argv: string[];
  cwd: () => string;
  env: Record<string, string | undefined>;
  exit: (code: number) => never;
};
