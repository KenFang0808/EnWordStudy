import { Interactive, useVideoConfig } from "remotion";
import { fontFamily } from "../font";

export const Card: React.FC<{
  readonly title: string;
  readonly body?: string;
  readonly name?: string;
  readonly index?: number;
  readonly accentColor?: string;
}> = ({ title, body, name, index, accentColor = "#38BDF8" }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  return (
    <Interactive.Div
      name={name ?? "Card"}
      style={{
        flex: 1,
        minWidth: 0,
        padding: isPortrait ? "38px 32px" : "42px 36px",
        borderRadius: 30,
        background:
          "linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.64))",
        border: "1px solid rgba(148, 163, 184, 0.14)",
        boxShadow: `0 28px 60px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.06)`,
        backdropFilter: "blur(10px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${accentColor}22, transparent 32%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: isPortrait ? 24 : 28,
          left: isPortrait ? 24 : 28,
          width: isPortrait ? 54 : 62,
          height: 4,
          borderRadius: 999,
          backgroundColor: accentColor,
          boxShadow: `0 0 22px ${accentColor}99`,
        }}
      />
      <div
        style={{
          fontFamily,
          fontSize: isPortrait ? 24 : 28,
          fontWeight: 700,
          color: accentColor,
          letterSpacing: 2.4,
          marginBottom: isPortrait ? 16 : 18,
          marginTop: isPortrait ? 22 : 26,
          position: "relative",
        }}
      >
        {String((index ?? 0) + 1).padStart(2, "0")}
      </div>
      <div
        style={{
          fontFamily,
          fontSize: isPortrait ? 46 : 54,
          fontWeight: 800,
          color: "#F8FAFC",
          lineHeight: 1.16,
          letterSpacing: -1,
          marginBottom: body ? 14 : 0,
          position: "relative",
        }}
      >
        {title}
      </div>
      {body ? (
        <div
          style={{
            fontFamily,
            fontSize: isPortrait ? 30 : 34,
            fontWeight: 600,
            color: "#94A3B8",
            lineHeight: 1.38,
            position: "relative",
          }}
        >
          {body}
        </div>
      ) : null}
    </Interactive.Div>
  );
};
