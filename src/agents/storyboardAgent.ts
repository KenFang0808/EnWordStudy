import { VIDEO_DEFAULTS } from "../models/video.ts";
import type { Script } from "../models/script.ts";
import type { VideoRequest } from "../models/input.ts";
import {
  storyboardSchema,
  type Scene,
  type SceneType,
  type Storyboard,
} from "../models/storyboard.ts";
import { countWords } from "../utils/words.ts";

const SCENE_PLAN: Array<{
  id: string;
  type: SceneType;
  sectionIndex: number | "hook" | "memory" | "practice";
}> = [
  { id: "intro", type: "intro", sectionIndex: "hook" },
  { id: "definition", type: "content", sectionIndex: 0 },
  { id: "usage", type: "diagram", sectionIndex: 1 },
  { id: "examples", type: "list", sectionIndex: 2 },
  { id: "contrast", type: "content", sectionIndex: 3 },
  { id: "memory", type: "quote", sectionIndex: "memory" },
  { id: "outro", type: "outro", sectionIndex: "practice" },
];

const closingSentences = (script: Script): string[] =>
  script.closing.split(/(?<=[.!?])\s+/).filter(Boolean);

const closingFor = (
  script: Script,
  part: "memory" | "outro",
): string => {
  const sentences = closingSentences(script);
  if (part === "memory") {
    return sentences[0] ?? script.closing;
  }

  return sentences.slice(1).join(" ") || script.closing;
};

const narrationFor = (script: Script, planIndex: number): string => {
  const plan = SCENE_PLAN[planIndex];
  if (plan.sectionIndex === "hook") {
    return script.hook;
  }
  if (plan.sectionIndex === "memory") {
    return closingFor(script, "memory");
  }
  if (plan.sectionIndex === "practice") {
    return closingFor(script, "outro");
  }

  const section = script.sections[plan.sectionIndex];
  if (!section) {
    throw new Error(`Script is missing section ${plan.sectionIndex + 1}.`);
  }

  return section.narration;
};

const headingFor = (script: Script, planIndex: number): string => {
  const plan = SCENE_PLAN[planIndex];
  if (plan.sectionIndex === "hook") {
    return script.topic;
  }
  if (plan.sectionIndex === "memory") {
    return closingFor(script, "memory");
  }
  if (plan.sectionIndex === "practice") {
    return closingFor(script, "outro");
  }

  return script.sections[plan.sectionIndex]?.heading ?? script.topic;
};

const getMinimumSceneDuration = (type: SceneType): number => {
  if (type === "outro" || type === "quote") {
    return 3;
  }

  return type === "list" ? 7 : 5;
};

export const generateStoryboard = (
  request: VideoRequest,
  script: Script,
): Storyboard => {
  if (script.sections.length < 4) {
    throw new Error("Storyboard Agent needs at least 4 script sections.");
  }

  const weights = SCENE_PLAN.map((_, index) =>
    Math.max(8, countWords(narrationFor(script, index))),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const transitionSeconds = SCENE_PLAN.slice(0, -1).length * 0.4;
  const targetSceneSeconds =
    script.targetDurationSeconds + transitionSeconds;

  const scenes: Scene[] = SCENE_PLAN.map((plan, index) => {
    const durationInSeconds = Math.max(
      getMinimumSceneDuration(plan.type),
      Number(
        ((weights[index] / totalWeight) * targetSceneSeconds).toFixed(2),
      ),
    );
    const section =
      typeof plan.sectionIndex === "number"
        ? script.sections[plan.sectionIndex]
        : undefined;

    return {
      id: plan.id,
      type: plan.type,
      durationInSeconds,
      narration: narrationFor(script, index),
      onScreenText: {
        eyebrow:
          plan.type === "intro"
            ? "WORD OF THE DAY"
            : plan.type === "quote" || plan.type === "outro"
              ? undefined
              : script.topic.toUpperCase(),
        progressLabel: `${index + 1} / ${SCENE_PLAN.length}`,
        title: headingFor(script, index),
        subtitle:
          plan.type === "intro"
            ? script.vocabulary.definition
            : plan.type === "quote" ||
                plan.type === "outro" ||
                plan.type === "list"
              ? undefined
              : section?.points?.[0],
        pronunciation:
          plan.type === "intro" ? script.vocabulary.pronunciation : undefined,
        partOfSpeech:
          plan.type === "intro" ? script.vocabulary.partOfSpeech : undefined,
      },
      visual: {
        highlightTerm: script.topic,
        items:
          plan.id === "examples"
            ? script.vocabulary.examples.map((example) => ({
                title: example,
              }))
            : section?.points?.map((point) => ({ title: point })),
      },
      animation: {
        enter:
          plan.type === "intro"
            ? "none"
            : plan.type === "quote"
              ? "scale"
              : "fade",
        exit: plan.type === "outro" ? "none" : "fade",
      },
      // eslint-disable-next-line @remotion/non-pure-animation
      transition: {
        type: plan.type === "outro" ? "none" : "fade",
        durationInSeconds: plan.type === "outro" ? 0 : 0.4,
      },
    };
  });

  const parsed = storyboardSchema.safeParse({
    version: 1,
    topic: request.topic,
    language: request.language,
    style: request.style,
    audience: request.audience,
    fps: VIDEO_DEFAULTS.fps,
    width: VIDEO_DEFAULTS.width,
    height: VIDEO_DEFAULTS.height,
    voiceoverFile: null,
    musicFile: null,
    musicVolume: VIDEO_DEFAULTS.musicVolume,
    captions: [],
    scenes,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Storyboard JSON is invalid: ${details}`);
  }

  return parsed.data;
};
