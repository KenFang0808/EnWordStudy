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

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
          name="Welcome title"
          style={{
            fontFamily,
            fontSize: 96,
            fontWeight: 700,
            color: "#F8FAFC",
            letterSpacing: -1.5,
            textAlign: "center",
            opacity: interpolate(frame, [0, 0.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            scale: interpolate(frame, [0, 0.8 * fps], [0.9, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          Welcome to AI Video
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
