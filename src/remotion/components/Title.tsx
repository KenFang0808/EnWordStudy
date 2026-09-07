import { Interactive, useVideoConfig } from "remotion";
import { fontFamily } from "../font";

export const Title: React.FC<{
  readonly text: string;
  readonly name?: string;
}> = ({ text, name }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  return (
    <Interactive.Div
      name={name ?? "Title"}
      style={{
        fontFamily,
        fontSize: isPortrait ? 82 : 108,
        fontWeight: 800,
        color: "#F8FAFC",
        letterSpacing: isPortrait ? -1.8 : -2.4,
        lineHeight: 1.02,
        maxWidth: isPortrait ? 780 : 1400,
        textShadow: "0 18px 42px rgba(8, 15, 32, 0.35)",
      }}
    >
      {text}
    </Interactive.Div>
  );
};
