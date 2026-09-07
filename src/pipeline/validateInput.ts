import { videoRequestSchema, type VideoRequest } from "../models/input.ts";

export const parseCliArgs = (argv: string[]): VideoRequest => {
  const args = argv.slice(2);
  const options: Record<string, string> = {};
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for --${key}.`);
      }
      options[key] = value;
      index += 1;
      continue;
    }

    positionals.push(arg);
  }

  if (positionals.length > 1) {
    throw new Error(
      `Unexpected extra arguments: ${positionals.slice(1).join(" ")}`,
    );
  }

  const raw: Record<string, unknown> = {};
  const topic = positionals[0] ?? options.topic;
  if (topic) {
    raw.topic = topic;
  }
  if (options.language) {
    raw.language = options.language;
  }
  if (options.duration) {
    const durationValue = Number.parseFloat(options.duration);
    if (!Number.isFinite(durationValue)) {
      throw new Error(`Invalid --duration value: ${options.duration}`);
    }
    raw.duration = durationValue;
  }
  if (options.style) {
    raw.style = options.style;
  }
  if (options.audience) {
    raw.audience = options.audience;
  }

  return validateInput(raw);
};

export const validateInput = (raw: unknown): VideoRequest => {
  const parsed = videoRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "input";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    throw new Error(`Invalid input: ${details}`);
  }

  return parsed.data;
};
