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

export const Scene2: React.FC = () => {
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
          name="Created with title"
          style={{
            fontFamily,
            fontSize: 80,
            fontWeight: 700,
            color: "#F8FAFC",
            letterSpacing: -1.2,
            textAlign: "center",
            opacity: interpolate(frame, [0, 0.45 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(
              frame,
              [0, 0.55 * fps],
              ["-480px 0px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              },
            ),
          }}
        >
          Created with Remotion + AI
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
