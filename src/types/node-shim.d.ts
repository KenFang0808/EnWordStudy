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
  export function openSync(path: string, flags: string): number;
  export function writeSync(fd: number, data: string): number;
  export function closeSync(fd: number): void;
  export function unlinkSync(path: string): void;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
  export function dirname(path: string): string;
  export function resolve(...parts: string[]): string;
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
  pid: number;
  execPath: string;
  cwd: () => string;
  env: Record<string, string | undefined>;
  exitCode?: number;
  exit: (code: number) => never;
  kill: (pid: number, signal?: number) => void;
  on: (event: "exit", listener: () => void) => void;
};
