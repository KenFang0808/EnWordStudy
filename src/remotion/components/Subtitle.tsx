import { Interactive, useVideoConfig } from "remotion";
import { fontFamily } from "../font";

export const Subtitle: React.FC<{
  readonly text: string;
  readonly name?: string;
}> = ({ text, name }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  return (
    <Interactive.Div
      name={name ?? "Subtitle"}
      style={{
        fontFamily,
        fontSize: isPortrait ? 42 : 50,
        fontWeight: 600,
        color: "#CBD5E1",
        letterSpacing: -0.5,
        lineHeight: 1.26,
        maxWidth: isPortrait ? 760 : 1200,
      }}
    >
      {text}
    </Interactive.Div>
  );
};
