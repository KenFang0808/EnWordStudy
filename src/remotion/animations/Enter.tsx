import type { Animation } from "../../models/storyboard";
import { FadeIn } from "./FadeIn";
import { ScaleIn } from "./ScaleIn";
import { SlideIn } from "./SlideIn";

export const Enter: React.FC<{
  readonly type: Animation["enter"];
  readonly children: React.ReactNode;
}> = ({ type, children }) => {
  if (type === "slide") {
    return <SlideIn>{children}</SlideIn>;
  }

  if (type === "scale") {
    return <ScaleIn>{children}</ScaleIn>;
  }

  if (type === "none") {
    return children;
  }

  return <FadeIn>{children}</FadeIn>;
};
