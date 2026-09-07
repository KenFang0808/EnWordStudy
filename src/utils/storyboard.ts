import storyboardJson from "../../data/storyboard.json";
import { storyboardSchema, type Storyboard } from "../models/storyboard";
import { assertMinimumDuration } from "./duration";

const formatStoryboardError = (error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): string => {
  return error.issues
    .map((issue) => {
      const path =
        issue.path.length > 0
          ? issue.path.map(String).join(".")
          : "storyboard";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
};

export const loadStoryboard = (): Storyboard => {
  const parsed = storyboardSchema.safeParse(storyboardJson);
  if (!parsed.success) {
    throw new Error(
      `Invalid data/storyboard.json: ${formatStoryboardError(parsed.error)}`,
    );
  }

  const emptyNarration = parsed.data.scenes.find((scene) => {
    return scene.narration.trim().length === 0;
  });
  if (emptyNarration) {
    throw new Error(`Scene "${emptyNarration.id}" is missing narration.`);
  }

  assertMinimumDuration(parsed.data);
  return parsed.data;
};

export const getSceneByType = (
  storyboard: Storyboard,
  type: Storyboard["scenes"][number]["type"],
): Storyboard["scenes"][number] => {
  const scene = storyboard.scenes.find((item) => item.type === type);
  if (!scene) {
    throw new Error(`No ${type} scene found in storyboard.json.`);
  }

  return scene;
};
