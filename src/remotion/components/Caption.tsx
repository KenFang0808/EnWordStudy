import {
  AbsoluteFill,
  Interactive,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CaptionCue } from "../../models/storyboard";
import { fontFamily } from "../font";
import { HighlightedText } from "./HighlightedText";

export const Caption: React.FC<{
  readonly cues: CaptionCue[];
  readonly highlightTerm: string;
}> = ({ cues, highlightTerm }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const timeMs = (frame / fps) * 1000;
  const cue = cues.find((item) => timeMs >= item.startMs && timeMs < item.endMs);

  if (!cue) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: isPortrait ? 190 : 110,
        pointerEvents: "none",
      }}
    >
      <Interactive.Div
        name="Caption"
        style={{
          fontFamily,
          fontSize: isPortrait ? 46 : 54,
          fontWeight: 800,
          color: "#F8FAFC",
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: isPortrait ? 860 : 1280,
          padding: isPortrait ? "20px 30px" : "18px 30px",
          borderRadius: 20,
          backgroundColor: "rgba(10, 14, 26, 0.72)",
          textShadow: "0 2px 16px rgba(0, 0, 0, 0.45)",
        }}
      >
        <HighlightedText text={cue.text} term={highlightTerm} />
      </Interactive.Div>
    </AbsoluteFill>
  );
};
