import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const FadeIn: React.FC<{
  readonly children: React.ReactNode;
}> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        opacity: interpolate(frame, [0, 0.55 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      {children}
    </div>
  );
};
