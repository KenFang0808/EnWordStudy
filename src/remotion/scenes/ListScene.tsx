import { useVideoConfig } from "remotion";
import type { StoryboardSceneProps } from "../../models/storyboard";
import { Card } from "../components/Card";
import { SceneShell } from "../components/SceneShell";
import { Subtitle } from "../components/Subtitle";
import { Title } from "../components/Title";

export const ListScene: React.FC<StoryboardSceneProps> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const items = scene.visual.items ?? [];

  return (
    <SceneShell scene={scene}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          gap: isPortrait ? 32 : 28,
        }}
      >
        <div>
          <Title text={scene.onScreenText.title} name="List title" />
          {scene.onScreenText.subtitle ? (
            <div style={{ marginTop: 18 }}>
              <Subtitle text={scene.onScreenText.subtitle} name="List subtitle" />
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: isPortrait ? "column" : "row",
            gap: isPortrait ? 22 : 26,
            marginTop: isPortrait ? 18 : 28,
            alignItems: "stretch",
            flexGrow: isPortrait ? 0 : 1,
          }}
        >
          {items.slice(0, 3).map((item, index) => (
            <Card
              key={`${scene.id}-${item.title}`}
              title={item.title}
              body={item.body}
              index={index}
              accentColor={scene.visual.accentColor}
            />
          ))}
        </div>
      </div>
    </SceneShell>
  );
};
