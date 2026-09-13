import { useVideoConfig } from "remotion";
import type { StoryboardSceneProps } from "../../models/storyboard";
import { Card } from "../components/Card";
import { HighlightedText } from "../components/HighlightedText";
import { SceneShell } from "../components/SceneShell";
import { Subtitle } from "../components/Subtitle";
import { Title } from "../components/Title";
import { fontFamily } from "../font";

export const ListScene: React.FC<StoryboardSceneProps> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const items = scene.visual.items ?? [];
  const isExampleScene = scene.id === "examples";

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
            isExampleScene ? (
              <div
                key={`${scene.id}-${item.title}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 22,
                  padding: isPortrait ? "30px 28px" : "34px 32px",
                  borderRadius: 28,
                  background:
                    "linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.66))",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    fontFamily,
                    fontSize: 26,
                    fontWeight: 800,
                    color: scene.visual.accentColor ?? "#22D3EE",
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontFamily,
                    fontSize: isPortrait ? 38 : 42,
                    fontWeight: 700,
                    color: "#F8FAFC",
                    lineHeight: 1.32,
                  }}
                >
                  <HighlightedText
                    text={item.title}
                    term={scene.visual.highlightTerm ?? ""}
                    accentColor={scene.visual.accentColor}
                  />
                </div>
              </div>
            ) : (
              <Card
                key={`${scene.id}-${item.title}`}
                title={item.title}
                body={item.body}
                index={index}
                accentColor={scene.visual.accentColor}
              />
            )
          ))}
        </div>
      </div>
    </SceneShell>
  );
};
