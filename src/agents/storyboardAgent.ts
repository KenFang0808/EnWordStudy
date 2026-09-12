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
  sectionIndex: number | "hook" | "closing" | "quote";
}> = [
  { id: "intro", type: "intro", sectionIndex: "hook" },
  { id: "definition", type: "content", sectionIndex: 0 },
  { id: "loop", type: "diagram", sectionIndex: 1 },
  { id: "traits", type: "list", sectionIndex: 2 },
  { id: "audience", type: "content", sectionIndex: 3 },
  { id: "quote", type: "quote", sectionIndex: "quote" },
  { id: "outro", type: "outro", sectionIndex: "closing" },
];

const closingSentences = (script: Script): string[] =>
  script.closing
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const OUTRO_TEMPLATES: Array<{
  narration: (script: Script) => string;
  heading: (script: Script) => string;
}> = [
  {
    narration: (script) =>
      `Now you know how to recognize and use "${script.topic}" more naturally.`,
    heading: (script) => `Use "${script.topic}" naturally`,
  },
  {
    narration: (script) =>
      `Keep "${script.topic}" in mind the next time you want a more precise, vivid way to describe this idea.`,
    heading: (script) => `Remember "${script.topic}"`,
  },
  {
    narration: (script) =>
      `The next time you hear or read "${script.topic}", you will be able to catch its meaning much faster.`,
    heading: (script) => `Spot "${script.topic}" faster`,
  },
  {
    narration: (script) =>
      `Try using "${script.topic}" in one sentence today so it feels natural the next time you need it.`,
    heading: (script) => `Practice "${script.topic}" today`,
  },
];

const pickFallbackOutroTemplate = (
  script: Script,
): (typeof OUTRO_TEMPLATES)[number] => {
  const hash = Array.from(script.topic).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  return OUTRO_TEMPLATES[hash % OUTRO_TEMPLATES.length];
};

const fallbackOutroNarration = (script: Script): string =>
  pickFallbackOutroTemplate(script).narration(script);

const fallbackOutroHeading = (script: Script): string =>
  pickFallbackOutroTemplate(script).heading(script);

const narrationFor = (script: Script, planIndex: number): string => {
  const plan = SCENE_PLAN[planIndex];
  if (plan.sectionIndex === "hook") {
    return script.hook;
  }
  if (plan.sectionIndex === "quote") {
    return closingSentences(script)[0] ?? script.closing;
  }
  if (plan.sectionIndex === "closing") {
    const remainingClosing = closingSentences(script).slice(1).join(" ");
    return remainingClosing || fallbackOutroNarration(script);
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
  if (plan.sectionIndex === "quote") {
    return closingSentences(script)[0] ?? script.closing;
  }
  if (plan.sectionIndex === "closing") {
    const remainingClosing = closingSentences(script).slice(1).join(" ");
    return remainingClosing || fallbackOutroHeading(script);
  }

  return script.sections[plan.sectionIndex]?.heading ?? script.topic;
};

const getMinimumSceneDuration = (type: SceneType): number => {
  if (type === "outro") {
    return 1;
  }

  return 6;
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

  const scenes: Scene[] = SCENE_PLAN.map((plan, index) => {
    const durationInSeconds = Math.max(
      getMinimumSceneDuration(plan.type),
      Math.round((weights[index] / totalWeight) * request.duration),
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
            ? `FOR ${request.audience.toUpperCase()}`
            : plan.type === "quote" || plan.type === "outro"
              ? undefined
              : section?.heading.toUpperCase(),
        title: headingFor(script, index),
        subtitle:
          plan.type === "intro"
            ? script.hook.split(/(?<=\.)\s+/)[1]
            : plan.type === "quote" || plan.type === "outro"
              ? undefined
            : section?.points?.[0],
      },
      visual: {
        items: section?.points?.map((point) => ({ title: point })),
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
