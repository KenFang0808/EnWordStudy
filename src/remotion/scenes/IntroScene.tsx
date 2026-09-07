import { Interactive, useVideoConfig } from "remotion";
import type { StoryboardSceneProps } from "../../models/storyboard";
import { SceneShell } from "../components/SceneShell";
import { Subtitle } from "../components/Subtitle";
import { Title } from "../components/Title";
import { fontFamily } from "../font";

export const IntroScene: React.FC<StoryboardSceneProps> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  return (
    <SceneShell scene={scene}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: "100%",
          gap: isPortrait ? 22 : 24,
        }}
      >
        <div
          style={{
            maxWidth: isPortrait ? 860 : 980,
          }}
        >
          <Title text={scene.onScreenText.title} name="Intro title" />
          {scene.onScreenText.subtitle ? (
            <div style={{ marginTop: 18 }}>
              <Subtitle text={scene.onScreenText.subtitle} name="Intro subtitle" />
            </div>
          ) : null}
          <Interactive.Div
            name="Intro narration summary"
            style={{
              fontFamily,
              fontSize: isPortrait ? 32 : 34,
              fontWeight: 600,
              color: "#94A3B8",
              lineHeight: 1.36,
              marginTop: 28,
              maxWidth: isPortrait ? 760 : 820,
            }}
          >
            {scene.narration}
          </Interactive.Div>
        </div>
      </div>
    </SceneShell>
  );
};
