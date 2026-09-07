import { Interactive, useCurrentFrame, useVideoConfig } from "remotion";

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = durationInFrames <= 1 ? 1 : frame / (durationInFrames - 1);

  return (
    <Interactive.Div
      name="Progress bar"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 5,
        width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
        backgroundColor: "#38BDF8",
      }}
    />
  );
};
