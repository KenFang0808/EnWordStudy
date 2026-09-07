import { AbsoluteFill } from "remotion";

export const Background: React.FC = () => {
  return (
    <AbsoluteFill
      name="Background"
      style={{
        backgroundColor: "#0A0E1A",
        backgroundImage:
          "radial-gradient(ellipse 80% 55% at 50% 42%, rgba(56, 189, 248, 0.16), transparent 70%)",
      }}
    />
  );
};
