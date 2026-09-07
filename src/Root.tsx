import "./index.css";
import { Composition, Folder } from "remotion";
import { DemoVideo } from "./DemoVideo";
import { calculateDemoMetadata } from "./DemoVideo/calculate-metadata";
import { Scene1 } from "./DemoVideo/Scene1";
import { Scene2 } from "./DemoVideo/Scene2";
import { Scene3 } from "./DemoVideo/Scene3";
import { HelloWorld } from "./HelloWorld";
import { Logo } from "./HelloWorld/Logo";
import { aiVideoPropsSchema } from "./models/video";
import { storyboardScenePropsSchema } from "./models/storyboard";
import { calculateAIVideoMetadata } from "./remotion/calculate-metadata";
import { AIVideo } from "./remotion/Video";
import { ContentScene } from "./remotion/scenes/ContentScene";
import { DiagramScene } from "./remotion/scenes/DiagramScene";
import { IntroScene } from "./remotion/scenes/IntroScene";
import { ListScene } from "./remotion/scenes/ListScene";
import { OutroScene } from "./remotion/scenes/OutroScene";
import { QuoteScene } from "./remotion/scenes/QuoteScene";
import { getStoryboardDurationInFrames, secondsToFrames } from "./utils/duration";
import { getSceneByType, loadStoryboard } from "./utils/storyboard";

const storyboard = loadStoryboard();
const introScene = getSceneByType(storyboard, "intro");
const contentScene = getSceneByType(storyboard, "content");
const diagramScene = getSceneByType(storyboard, "diagram");
const listScene = getSceneByType(storyboard, "list");
const quoteScene = getSceneByType(storyboard, "quote");
const outroScene = getSceneByType(storyboard, "outro");

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AIVideo"
        component={AIVideo}
        durationInFrames={getStoryboardDurationInFrames(storyboard)}
        fps={storyboard.fps}
        width={storyboard.width}
        height={storyboard.height}
        schema={aiVideoPropsSchema}
        defaultProps={{
          showCaptions: true,
        }}
        calculateMetadata={calculateAIVideoMetadata}
      />

      <Folder name="AIVideo-Scenes">
        <Composition
          id="IntroScene"
          component={IntroScene}
          durationInFrames={secondsToFrames(
            introScene.durationInSeconds,
            storyboard.fps,
          )}
          fps={storyboard.fps}
          width={storyboard.width}
          height={storyboard.height}
          schema={storyboardScenePropsSchema}
          defaultProps={{ scene: introScene }}
        />
        <Composition
          id="ContentScene"
          component={ContentScene}
          durationInFrames={secondsToFrames(
            contentScene.durationInSeconds,
            storyboard.fps,
          )}
          fps={storyboard.fps}
          width={storyboard.width}
          height={storyboard.height}
          schema={storyboardScenePropsSchema}
          defaultProps={{ scene: contentScene }}
        />
        <Composition
          id="DiagramScene"
          component={DiagramScene}
          durationInFrames={secondsToFrames(
            diagramScene.durationInSeconds,
            storyboard.fps,
          )}
          fps={storyboard.fps}
          width={storyboard.width}
          height={storyboard.height}
          schema={storyboardScenePropsSchema}
          defaultProps={{ scene: diagramScene }}
        />
        <Composition
          id="ListScene"
          component={ListScene}
          durationInFrames={secondsToFrames(
            listScene.durationInSeconds,
            storyboard.fps,
          )}
          fps={storyboard.fps}
          width={storyboard.width}
          height={storyboard.height}
          schema={storyboardScenePropsSchema}
          defaultProps={{ scene: listScene }}
        />
        <Composition
          id="QuoteScene"
          component={QuoteScene}
          durationInFrames={secondsToFrames(
            quoteScene.durationInSeconds,
            storyboard.fps,
          )}
          fps={storyboard.fps}
          width={storyboard.width}
          height={storyboard.height}
          schema={storyboardScenePropsSchema}
          defaultProps={{ scene: quoteScene }}
        />
        <Composition
          id="OutroScene"
          component={OutroScene}
          durationInFrames={secondsToFrames(
            outroScene.durationInSeconds,
            storyboard.fps,
          )}
          fps={storyboard.fps}
          width={storyboard.width}
          height={storyboard.height}
          schema={storyboardScenePropsSchema}
          defaultProps={{ scene: outroScene }}
        />
      </Folder>

      <Composition
        id="DemoVideo"
        component={DemoVideo}
        durationInFrames={145}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          voiceoverFile: "audio/voiceover.mp3",
          scene1Frames: 50,
          scene2Frames: 46,
          scene3Frames: 49,
        }}
        calculateMetadata={calculateDemoMetadata}
      />

      <Folder name="DemoVideo-Scenes">
        <Composition
          id="Scene1"
          component={Scene1}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene2"
          component={Scene2}
          durationInFrames={120}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Scene3"
          component={Scene3}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>

      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />

      <Composition
        id="OnlyLogo"
        component={Logo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          logoColor1: "#91dAE2",
          logoColor2: "#86A8E7",
        }}
      />
    </>
  );
};
