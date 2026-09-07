import { Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { StoryboardSceneProps } from "../../models/storyboard";
import { Card } from "../components/Card";
import { SceneShell } from "../components/SceneShell";
import { Subtitle } from "../components/Subtitle";
import { Title } from "../components/Title";
import { fontFamily } from "../font";

export const OutroScene: React.FC<StoryboardSceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const items = scene.visual.items ?? [];
  const isSingleBlock = !scene.onScreenText.subtitle && items.length === 0;
  const emphasisMotionStyle = isSingleBlock
    ? {
        opacity: interpolate(frame, [0, 0.4 * fps], [0.72, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        }),
        transform: `scale(${interpolate(frame, [0, 0.55 * fps], [0.968, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        })})`,
        transformOrigin: "center center",
      }
    : undefined;

  return (
    <SceneShell scene={scene}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: isSingleBlock ? "center" : "flex-start",
          height: "100%",
          gap: isPortrait ? 28 : 24,
        }}
      >
        <div
          style={{
            maxWidth: isSingleBlock
              ? isPortrait
                ? 860
                : 1000
              : isPortrait
                ? 760
                : 860,
          }}
        >
          {isSingleBlock ? (
            <div style={emphasisMotionStyle}>
              <Interactive.Div
                name="Outro single block"
                style={{
                  fontFamily,
                  fontSize: isPortrait ? 78 : 96,
                  fontWeight: 800,
                  color: "#F8FAFC",
                  lineHeight: 1.14,
                  letterSpacing: -1.6,
                  textAlign: "center",
                }}
              >
                {scene.onScreenText.title}
              </Interactive.Div>
            </div>
          ) : (
            <Title text={scene.onScreenText.title} name="Outro title" />
          )}
          {scene.onScreenText.subtitle ? (
            <div style={{ marginTop: 18 }}>
              <Subtitle text={scene.onScreenText.subtitle} name="Outro subtitle" />
            </div>
          ) : null}
          {!isSingleBlock ? (
            <Interactive.Div
              name="Outro narration summary"
              style={{
                fontFamily,
                fontSize: isPortrait ? 32 : 34,
                fontWeight: 600,
                color: "#94A3B8",
                lineHeight: 1.36,
                marginTop: 24,
                maxWidth: isPortrait ? 760 : 820,
              }}
            >
              {scene.narration}
            </Interactive.Div>
          ) : null}
        </div>
        {items.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: isPortrait ? "column" : "row",
              gap: isPortrait ? 18 : 24,
              marginTop: isPortrait ? 8 : 12,
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
