import { Interactive, useVideoConfig } from "remotion";
import type { StoryboardSceneProps } from "../../models/storyboard";
import { SceneShell } from "../components/SceneShell";
import { Subtitle } from "../components/Subtitle";
import { Title } from "../components/Title";
import { fontFamily } from "../font";

export const IntroScene: React.FC<StoryboardSceneProps> = ({ scene }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const isWordFocusTitle = /^[a-zA-Z-]+$/.test(scene.onScreenText.title.trim());
  const accent = scene.visual.accentColor ?? "#22D3EE";

  return (
    <SceneShell scene={scene}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: isWordFocusTitle ? "center" : "flex-start",
          height: "100%",
          gap: isPortrait ? 22 : 24,
        }}
      >
        <div
          style={{
            maxWidth: isWordFocusTitle
              ? isPortrait
                ? 920
                : 1080
              : isPortrait
                ? 860
                : 980,
            width: "100%",
          }}
        >
          {isWordFocusTitle ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                  marginBottom: isPortrait ? 42 : 50,
                }}
              >
                <Interactive.Div
                  name="Intro daily word shadow"
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: isPortrait
                      ? "translate(12px, 12px)"
                      : "translate(14px, 14px)",
                    fontFamily,
                    fontSize: isPortrait ? 176 : 220,
                    fontWeight: 900,
                    letterSpacing: isPortrait ? -9 : -11,
                    lineHeight: 0.92,
                    color: accent,
                    opacity: 0.98,
                    textShadow: `0 18px 40px ${accent}55`,
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {scene.onScreenText.title}
                </Interactive.Div>
                <Interactive.Div
                  name="Intro daily word hero"
                  style={{
                    position: "relative",
                    fontFamily,
                    fontSize: isPortrait ? 176 : 220,
                    fontWeight: 900,
                    letterSpacing: isPortrait ? -9 : -11,
                    lineHeight: 0.92,
                    color: "#F8FAFC",
                    WebkitTextStroke: isPortrait ? `4px ${accent}` : `5px ${accent}`,
                    textShadow:
                      "0 12px 32px rgba(7, 12, 24, 0.36), 0 0 30px rgba(34, 211, 238, 0.16)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {scene.onScreenText.title}
                </Interactive.Div>
              </div>
              {scene.onScreenText.pronunciation ||
              scene.onScreenText.partOfSpeech ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                    marginBottom: 12,
                  }}
                >
                  {scene.onScreenText.pronunciation ? (
                    <Interactive.Div
                      name="Pronunciation"
                      style={{
                        fontFamily,
                        fontSize: isPortrait ? 42 : 48,
                        fontWeight: 700,
                        color: "#F8FAFC",
                      }}
                    >
                      {scene.onScreenText.pronunciation}
                    </Interactive.Div>
                  ) : null}
                  {scene.onScreenText.partOfSpeech ? (
                    <Interactive.Div
                      name="Part of speech"
                      style={{
                        fontFamily,
                        fontSize: isPortrait ? 28 : 32,
                        fontWeight: 700,
                        color: accent,
                        padding: "10px 18px",
                        borderRadius: 999,
                        border: `2px solid ${accent}88`,
                        backgroundColor: `${accent}18`,
                      }}
                    >
                      {scene.onScreenText.partOfSpeech}
                    </Interactive.Div>
                  ) : null}
                </div>
              ) : null}
              {scene.onScreenText.subtitle ? (
                <div style={{ marginTop: 18 }}>
                  <Subtitle text={scene.onScreenText.subtitle} name="Intro subtitle" />
                </div>
              ) : null}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </SceneShell>
  );
};
