import { z } from "zod";

export const sceneTypeSchema = z.enum([
  "intro",
  "content",
  "diagram",
  "list",
  "quote",
  "outro",
]);

export const animationNameSchema = z.enum(["fade", "slide", "scale", "none"]);

export const animationSchema = z.object({
  enter: animationNameSchema,
  exit: animationNameSchema,
});

export const transitionTypeSchema = z.enum(["fade", "slide", "none"]);

export const transitionSchema = z.object({
  type: transitionTypeSchema,
  durationInSeconds: z.number().nonnegative(),
});

export const onScreenTextSchema = z.object({
  eyebrow: z.string().optional(),
  progressLabel: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  pronunciation: z.string().optional(),
  partOfSpeech: z.string().optional(),
});

export const visualItemSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
});

export const visualNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().optional(),
});

export const visualEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const visualSpecSchema = z.object({
  accentColor: z.string().optional(),
  highlightTerm: z.string().optional(),
  items: z.array(visualItemSchema).optional(),
  nodes: z.array(visualNodeSchema).optional(),
  edges: z.array(visualEdgeSchema).optional(),
  quote: z.string().optional(),
  attribution: z.string().optional(),
});

export const captionCueSchema = z.object({
  text: z.string().min(1),
  startMs: z.number().nonnegative(),
  endMs: z.number().positive(),
});

export const sceneSchema = z.object({
  id: z.string().min(1),
  type: sceneTypeSchema,
  durationInSeconds: z.number().positive(),
  narration: z.string().min(1),
  voiceoverFile: z.string().nullable().optional(),
  audioDurationSeconds: z.number().nonnegative().optional(),
  onScreenText: onScreenTextSchema,
  visual: visualSpecSchema,
  animation: animationSchema,
  // Remotion ESLint treats a CSS-like `transition` key as a component style.
  // This is storyboard data, not a CSS transition.
  // eslint-disable-next-line @remotion/non-pure-animation
  transition: transitionSchema,
});

export const storyboardSchema = z.object({
  version: z.literal(1),
  topic: z.string().min(1),
  language: z.string().min(1),
  style: z.string().min(1),
  audience: z.string().min(1),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  voiceoverFile: z.string().nullable(),
  musicFile: z.string().nullable(),
  musicVolume: z.number().min(0).max(1),
  captions: z.array(captionCueSchema),
  scenes: z.array(sceneSchema).min(1),
});

export type SceneType = z.infer<typeof sceneTypeSchema>;
export type Animation = z.infer<typeof animationSchema>;
export type Transition = z.infer<typeof transitionSchema>;
export type OnScreenText = z.infer<typeof onScreenTextSchema>;
export type VisualSpec = z.infer<typeof visualSpecSchema>;
export type CaptionCue = z.infer<typeof captionCueSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Storyboard = z.infer<typeof storyboardSchema>;

export const storyboardScenePropsSchema = z.object({
  scene: sceneSchema,
});

export type StoryboardSceneProps = z.infer<typeof storyboardScenePropsSchema>;
