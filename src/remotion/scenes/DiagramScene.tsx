import { Interactive, useVideoConfig } from "remotion";
import type { StoryboardSceneProps } from "../../models/storyboard";
import { SceneShell } from "../components/SceneShell";
import { fontFamily } from "../font";

export const DiagramScene: React.FC<StoryboardSceneProps> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const nodes = scene.visual.nodes ?? [];
  const isUsageScene = scene.id === "usage";

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
        <Interactive.Div
          name="Diagram title"
          style={{
            fontFamily,
            fontSize: isPortrait ? 78 : 90,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: -1.8,
            color: "#F8FAFC",
            maxWidth: isPortrait ? 800 : 980,
          }}
        >
          {scene.onScreenText.title}
        </Interactive.Div>
        <div
          style={{
            display: "flex",
            flexDirection: isPortrait ? "column" : "row",
            alignItems: "stretch",
            gap: isPortrait ? 18 : 22,
            marginTop: isPortrait ? 18 : 26,
          }}
        >
          {nodes.slice(0, 4).map((node, index) => (
            <div
              key={node.id}
              style={{
                display: "flex",
                flexDirection: isPortrait ? "column" : "row",
                alignItems: "center",
                flex: 1,
                gap: isPortrait ? 16 : 18,
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: isPortrait ? "34px 28px" : "38px 32px",
                  borderRadius: 30,
                  background:
                    "linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.64))",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  boxShadow:
                    "0 28px 60px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    fontFamily,
                    fontSize: isPortrait ? 42 : 46,
                    fontWeight: 800,
                    color: "#F8FAFC",
                    lineHeight: 1.14,
                    letterSpacing: -0.9,
                  }}
                >
                  {node.label}
                </div>
                {node.detail ? (
                  <div
                    style={{
                      fontFamily,
                      fontSize: isPortrait ? 28 : 30,
                      fontWeight: 600,
                      color: "#94A3B8",
                      lineHeight: 1.36,
                      marginTop: 14,
                    }}
                  >
                    {node.detail}
                  </div>
                ) : null}
              </div>
              {!isUsageScene &&
              index < Math.min(nodes.length, 4) - 1 ? (
                <div
                  style={{
                    fontSize: isPortrait ? 52 : 60,
                    color: scene.visual.accentColor ?? "#38BDF8",
                    lineHeight: 1,
                    transform: isPortrait ? "rotate(90deg)" : undefined,
                  }}
                >
                  →
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </SceneShell>
  );
};
