import { Interactive } from "remotion";
import { fontFamily } from "../font";

export const Icon: React.FC<{
  readonly label: string;
  readonly color?: string;
  readonly name?: string;
}> = ({ label, color = "#38BDF8", name }) => {
  return (
    <Interactive.Div
      name={name ?? "Icon"}
      style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(56, 189, 248, 0.12)",
        border: `1px solid ${color}55`,
        color,
        fontFamily,
        fontSize: 32,
        fontWeight: 700,
      }}
    >
      {label.slice(0, 1)}
    </Interactive.Div>
  );
};
