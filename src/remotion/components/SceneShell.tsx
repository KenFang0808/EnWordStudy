import {
  AbsoluteFill,
  Interactive,
  useVideoConfig,
} from "remotion";
import type { Scene } from "../../models/storyboard";
import { Enter } from "../animations/Enter";
import { fontFamily } from "../font";
import { Background } from "./Background";

export const SceneShell: React.FC<{
  readonly scene: Scene;
  readonly children: React.ReactNode;
}> = ({ scene, children }) => {
  const accent = scene.visual.accentColor ?? "#38BDF8";
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const isSingleTextScene =
    (scene.type === "quote" || scene.type === "outro") &&
    !scene.onScreenText.subtitle &&
    (scene.visual.items?.length ?? 0) === 0;
  return (
    <AbsoluteFill>
      <Background accentColor={accent} />
      <Enter type={scene.animation.enter}>
        <AbsoluteFill
          style={{
            padding: isSingleTextScene
              ? isPortrait
                ? "180px 56px 260px"
                : "140px 80px 180px"
              : isPortrait
                ? "96px 56px 200px"
                : "100px 80px 150px",
          }}
        >
          {!isSingleTextScene ? (
            <div
              style={{
                width: isPortrait ? 140 : 180,
                height: 6,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${accent}, rgba(255, 255, 255, 0.18))`,
                boxShadow: `0 0 28px ${accent}55`,
                marginBottom: isPortrait ? 24 : 28,
              }}
            />
          ) : null}
          {scene.onScreenText.eyebrow ? (
            <Interactive.Div
              name="Eyebrow"
              style={{
                fontFamily,
                fontSize: isPortrait ? 24 : 26,
                fontWeight: 700,
                letterSpacing: isPortrait ? 4 : 4.5,
                color: accent,
                marginBottom: isPortrait ? 20 : 24,
                textTransform: "uppercase",
              }}
            >
              {scene.onScreenText.eyebrow}
            </Interactive.Div>
          ) : null}
          {children}
        </AbsoluteFill>
      </Enter>
    </AbsoluteFill>
  );
};
