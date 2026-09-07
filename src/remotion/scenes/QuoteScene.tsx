import { Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { StoryboardSceneProps } from "../../models/storyboard";
import { SceneShell } from "../components/SceneShell";
import { fontFamily } from "../font";

export const QuoteScene: React.FC<StoryboardSceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const quote = scene.visual.quote ?? scene.onScreenText.title;
  const attribution = scene.visual.attribution;
  const accent = scene.visual.accentColor ?? "#F472B6";
  const isSingleBlock = !attribution;
  const emphasisMotionStyle = isSingleBlock
    ? {
        opacity: interpolate(frame, [0, 0.4 * fps], [0.7, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        }),
        transform: `scale(${interpolate(frame, [0, 0.55 * fps], [0.965, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        })})`,
        transformOrigin: "center center",
      }
    : undefined;

  return (
    <SceneShell scene={scene}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: isSingleBlock ? "center" : "flex-start",
          alignItems: isSingleBlock ? "center" : "flex-start",
          height: "100%",
          gap: isPortrait ? 28 : 24,
        }}
      >
        <div
          style={{
            maxWidth: isSingleBlock
              ? isPortrait
                ? 840
                : 1120
              : isPortrait
                ? 760
                : 980,
          }}
        >
          <div style={emphasisMotionStyle}>
            <Interactive.Div
              name="Quote"
              style={{
                fontFamily,
                fontSize: isSingleBlock
                  ? isPortrait
                    ? 78
                    : 96
                  : isPortrait
                    ? 54
                    : 62,
                fontWeight: isSingleBlock ? 800 : 700,
                color: "#F8FAFC",
                letterSpacing: isSingleBlock ? -1.4 : -0.8,
                lineHeight: isSingleBlock ? 1.14 : 1.22,
                textAlign: isSingleBlock ? "center" : "left",
              }}
            >
              {quote}
            </Interactive.Div>
          </div>
          {attribution ? (
            <Interactive.Div
              name="Attribution"
              style={{
                fontFamily,
                fontSize: isPortrait ? 26 : 30,
                fontWeight: 500,
                color: accent,
                marginTop: 20,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {attribution}
            </Interactive.Div>
          ) : null}
        </div>
      </div>
    </SceneShell>
  );
};
