import "./index.css";
import { Composition } from "remotion";
import { aiVideoPropsSchema } from "./models/video";
import { calculateAIVideoMetadata } from "./remotion/calculate-metadata";
import { AIVideo } from "./remotion/Video";
import { getStoryboardDurationInFrames } from "./utils/duration";
import { loadStoryboard } from "./utils/storyboard";

const storyboard = loadStoryboard();

export const VocabularyRoot: React.FC = () => {
  return (
    <Composition
      id="AIVideo"
      component={AIVideo}
      durationInFrames={getStoryboardDurationInFrames(storyboard)}
      fps={storyboard.fps}
      width={storyboard.width}
      height={storyboard.height}
      schema={aiVideoPropsSchema}
      defaultProps={{ showCaptions: true }}
      calculateMetadata={calculateAIVideoMetadata}
    />
  );
};
