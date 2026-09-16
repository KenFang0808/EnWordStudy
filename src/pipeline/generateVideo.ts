import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generateCaptions } from "../agents/captionAgent.ts";
import { generateMusic } from "../agents/musicAgent.ts";
import { runQa } from "../agents/qaAgent.ts";
import { generateScript } from "../agents/scriptAgent.ts";
import { generateStoryboard } from "../agents/storyboardAgent.ts";
import { applyVisuals } from "../agents/visualAgent.ts";
import { generateVoice } from "../agents/voiceAgent.ts";
import { PATHS } from "../utils/assets.ts";
import { getEnv, loadDotEnv } from "../utils/env.ts";
import {
  buildOutputStem,
  nextFinalOutputPath,
} from "../utils/outputName.ts";
import { writeJson } from "../utils/writeJson.ts";
import { getStoryboardDurationInSeconds } from "../utils/duration.ts";
import { createPipelineState, type PipelineState } from "./pipelineState.ts";
import { parseCliArgs, validateInput } from "./validateInput.ts";

const remotionBin = (): string => {
  const binary = join(process.cwd(), "node_modules/.bin/remotion");
  if (!existsSync(binary)) {
    throw new Error("Remotion CLI is not installed. Run npm install first.");
  }

  return binary;
};

const runRemotion = (args: string[]): void => {
  execFileSync(remotionBin(), args, { stdio: "inherit", cwd: process.cwd() });
};

const loadRequest = () => {
  const args = process.argv.slice(2);
  if (args.length === 0 && existsSync(join(process.cwd(), PATHS.input))) {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), PATHS.input), "utf8"),
    ) as unknown;
    return validateInput(raw);
  }

  return parseCliArgs(process.argv);
};

const fail = (stage: string, error: unknown): never => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n[${stage}] ${message}`);
  process.exit(1);
};

const generateVideo = async (): Promise<PipelineState> => {
  loadDotEnv();
  let ttsProvider = "unknown";

  let state: PipelineState;
  try {
    const request = loadRequest();
    writeJson(PATHS.input, request);
    state = createPipelineState(request);
    console.log(
      `Input: "${request.topic}" | ${request.duration}s | ${request.language} | ${request.style} | ${request.audience}`,
    );
  } catch (error) {
    return fail("validate-input", error);
  }

  try {
    state.stage = "script";
    state.script = await generateScript(state.request);
    writeJson(PATHS.script, state.script);
    console.log(`Script: ${state.script.wordCount} words`);
  } catch (error) {
    return fail("script", error);
  }

  try {
    state.stage = "storyboard";
    if (!state.script) {
      throw new Error("Script is missing after the Script Agent.");
    }
    state.storyboard = generateStoryboard(state.request, state.script);
  } catch (error) {
    return fail("storyboard", error);
  }

  try {
    state.stage = "visual";
    if (!state.storyboard) {
      throw new Error("Storyboard is missing after the Storyboard Agent.");
    }
    state.storyboard = applyVisuals(state.storyboard);
  } catch (error) {
    return fail("visual", error);
  }

  try {
    state.stage = "voice";
    if (!state.storyboard) {
      throw new Error("Storyboard is missing before the Voice Agent.");
    }
    const voiced = await generateVoice(state.storyboard);
    state.storyboard = voiced.storyboard;
    ttsProvider = voiced.ttsProvider;
  } catch (error) {
    return fail("voice", error);
  }

  try {
    state.stage = "music";
    if (!state.storyboard) {
      throw new Error("Storyboard is missing before the Music Agent.");
    }
    state.storyboard = generateMusic(state.storyboard);
  } catch (error) {
    return fail("music", error);
  }

  try {
    state.stage = "captions";
    if (!state.storyboard) {
      throw new Error("Storyboard is missing before the Caption Agent.");
    }
    state.storyboard = generateCaptions(state.storyboard);
    writeJson(PATHS.storyboard, state.storyboard);
    console.log(
      `Storyboard: ${state.storyboard.scenes.length} scenes, ${getStoryboardDurationInSeconds(state.storyboard).toFixed(1)}s`,
    );
  } catch (error) {
    return fail("captions", error);
  }

  try {
    state.stage = "compose";
    writeJson(PATHS.storyboard, state.storyboard);
  } catch (error) {
    return fail("compose", error);
  }

  try {
    state.stage = "preview";
    if (!state.storyboard) {
      throw new Error("Storyboard is missing before preview render.");
    }
    const durationFrames = Math.round(
      getStoryboardDurationInSeconds(state.storyboard) * state.storyboard.fps,
    );
    const frames = [
      30,
      Math.min(durationFrames - 1, Math.round(durationFrames / 2)),
      Math.max(0, durationFrames - 30),
    ];
    state.previewFrames = [];
    for (const [index, frame] of frames.entries()) {
      const output = `${PATHS.previewDir}/qa-frame-${index + 1}.png`;
      runRemotion(["still", "AIVideo", output, `--frame=${frame}`]);
      state.previewFrames.push(output);
    }
  } catch (error) {
    return fail("preview", error);
  }

  try {
    state.stage = "qa";
    runQa(state, "pre-render");
  } catch (error) {
    return fail("qa", error);
  }

  try {
    state.stage = "render";
    const outputPath = nextFinalOutputPath(
      buildOutputStem({
        topic: state.request.topic,
        ttsProvider,
        durationFactor: getEnv("INDEX_TTS_DURATION_FACTOR"),
      }),
    );
    console.log(`Render: writing ${outputPath}`);
    runRemotion(["render", "AIVideo", outputPath]);
    state.outputPath = outputPath;
    runQa(state, "post-render");
  } catch (error) {
    return fail("render", error);
  }

  console.log(`\nDone: ${state.outputPath}`);
  return state;
};

void generateVideo();
