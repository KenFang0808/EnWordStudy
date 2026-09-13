import { Interactive, useVideoConfig } from "remotion";
import type { StoryboardSceneProps } from "../../models/storyboard";
import { Card } from "../components/Card";
import { HighlightedText } from "../components/HighlightedText";
import { SceneShell } from "../components/SceneShell";
import { Subtitle } from "../components/Subtitle";
import { Title } from "../components/Title";
import { fontFamily } from "../font";

export const ContentScene: React.FC<StoryboardSceneProps> = ({ scene }) => {
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
          gap: isPortrait ? 28 : 24,
        }}
      >
        <div>
          <Title text={scene.onScreenText.title} name="Content title" />
          {scene.onScreenText.subtitle ? (
            <div style={{ marginTop: 16 }}>
              <Subtitle text={scene.onScreenText.subtitle} name="Content subtitle" />
            </div>
          ) : null}
        </div>
        <Interactive.Div
          name="Content narration summary"
          style={{
            fontFamily,
            fontSize: isPortrait ? 32 : 34,
            fontWeight: 600,
            color: "#94A3B8",
            lineHeight: 1.34,
            maxWidth: isPortrait ? 780 : 900,
          }}
        >
          <HighlightedText
            text={scene.onScreenText.body ?? scene.narration}
            term={scene.visual.highlightTerm ?? ""}
            accentColor={scene.visual.accentColor}
          />
        </Interactive.Div>
        {items.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: isPortrait ? "column" : "row",
              gap: isPortrait ? 18 : 24,
              marginTop: isPortrait ? 12 : 20,
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
        ) : null}
      </div>
    </SceneShell>
  );
};
