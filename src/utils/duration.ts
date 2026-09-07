import type { Scene, Storyboard } from "../models/storyboard";
import { VIDEO_DEFAULTS } from "../models/video.ts";

export const secondsToFrames = (seconds: number, fps: number): number => {
  return Math.max(1, Math.round(seconds * fps));
};

export const getTransitionDurationInFrames = (
  scene: Scene,
  fps: number,
  isLast: boolean,
): number => {
  if (isLast || scene.transition.type === "none") {
    return 0;
  }

  return secondsToFrames(scene.transition.durationInSeconds, fps);
};

export const getStoryboardDurationInFrames = (
  storyboard: Storyboard,
): number => {
  const { fps, scenes } = storyboard;
  const sceneFrames = scenes.reduce((sum, scene) => {
    return sum + secondsToFrames(scene.durationInSeconds, fps);
  }, 0);
  const transitionFrames = scenes.reduce((sum, scene, index) => {
    return (
      sum +
      getTransitionDurationInFrames(scene, fps, index === scenes.length - 1)
    );
  }, 0);

  return Math.max(1, sceneFrames - transitionFrames);
};

export const getSceneStartSeconds = (storyboard: Storyboard): number[] => {
  const starts: number[] = [];
  let elapsedSeconds = 0;

  storyboard.scenes.forEach((scene, index) => {
    starts.push(elapsedSeconds);
    const sceneSeconds =
      secondsToFrames(scene.durationInSeconds, storyboard.fps) /
      storyboard.fps;
    const transitionSeconds =
      getTransitionDurationInFrames(
        scene,
        storyboard.fps,
        index === storyboard.scenes.length - 1,
      ) / storyboard.fps;
    elapsedSeconds += sceneSeconds - transitionSeconds;
  });

  return starts;
};

export const getStoryboardDurationInSeconds = (
  storyboard: Storyboard,
): number => {
  return getStoryboardDurationInFrames(storyboard) / storyboard.fps;
};

export const assertMinimumDuration = (storyboard: Storyboard): void => {
  const durationInSeconds = getStoryboardDurationInSeconds(storyboard);
  if (durationInSeconds < VIDEO_DEFAULTS.minDurationSeconds) {
    throw new Error(
      `Storyboard duration is ${durationInSeconds.toFixed(2)}s, but the minimum is ${VIDEO_DEFAULTS.minDurationSeconds}s.`,
    );
  }
};
