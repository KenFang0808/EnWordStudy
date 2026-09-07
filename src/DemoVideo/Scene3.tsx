import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "./Background";
import { fontFamily } from "./font";

export const Scene3: React.FC<{
  readonly sceneDurationInFrames?: number;
}> = ({ sceneDurationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const sceneDuration = sceneDurationInFrames ?? durationInFrames;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Interactive.Div
          name="Lets build title"
          style={{
            fontFamily,
            fontSize: 120,
            fontWeight: 700,
            color: "#F8FAFC",
            letterSpacing: -2,
            textAlign: "center",
            opacity: interpolate(
              frame,
              [0, 0.25 * fps, sceneDuration - 0.7 * fps, sceneDuration],
              [0, 1, 1, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: [
                  Easing.bezier(0.16, 1, 0.3, 1),
                  Easing.linear,
                  Easing.bezier(0.16, 1, 0.3, 1),
                ],
              },
            ),
            scale: interpolate(
              frame,
              [sceneDuration - 0.7 * fps, sceneDuration],
              [1, 1.08],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                output: "perceptual-scale",
              },
            ),
          }}
        >
          Let's build!
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
