import type { Scene } from "../../models/storyboard";
import { ContentScene } from "./ContentScene";
import { DiagramScene } from "./DiagramScene";
import { IntroScene } from "./IntroScene";
import { ListScene } from "./ListScene";
import { OutroScene } from "./OutroScene";
import { QuoteScene } from "./QuoteScene";

export const SceneRenderer: React.FC<{
  readonly scene: Scene;
}> = ({ scene }) => {
  switch (scene.type) {
    case "intro":
      return <IntroScene scene={scene} />;
    case "content":
      return <ContentScene scene={scene} />;
    case "diagram":
      return <DiagramScene scene={scene} />;
    case "list":
      return <ListScene scene={scene} />;
    case "quote":
      return <QuoteScene scene={scene} />;
    case "outro":
      return <OutroScene scene={scene} />;
    default: {
      const unexpected: never = scene.type;
      throw new Error(`Unsupported scene type: ${String(unexpected)}`);
    }
  }
};
