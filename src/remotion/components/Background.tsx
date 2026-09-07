import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const Background: React.FC<{
  readonly accentColor?: string;
}> = ({ accentColor = "#38BDF8" }) => {
  const frame = useCurrentFrame();
  const accentX = interpolate(frame, [0, 180], [18, 34], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });
  const accentY = interpolate(frame, [0, 180], [20, 12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });
  const orbX = interpolate(frame, [0, 180], [78, 64], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });
  const orbY = interpolate(frame, [0, 180], [76, 84], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });
  return (
    <AbsoluteFill name="Background">
      <AbsoluteFill
        style={{
          backgroundColor: "#040816",
          backgroundImage:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(3, 7, 18, 1))",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle at ${accentX}% ${accentY}%, ${accentColor}55, transparent 0 32%), radial-gradient(circle at ${orbX}% ${orbY}%, rgba(168, 85, 247, 0.34), transparent 0 28%)`,
          filter: "blur(18px)",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)",
          backgroundSize: "140px 140px",
          opacity: 0.28,
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.18) 55%, transparent)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(2, 6, 23, 0) 0%, rgba(2, 6, 23, 0.14) 55%, rgba(2, 6, 23, 0.76) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
