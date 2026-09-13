import type { Scene, Storyboard, VisualSpec } from "../models/storyboard.ts";

const DEFAULT_ACCENTS = ["#38BDF8", "#818CF8", "#34D399", "#F472B6"] as const;
const STRONG_ACCENTS = ["#22D3EE", "#8B5CF6", "#F97316", "#F43F5E"] as const;

const pickPalette = (style: string) => {
  if (/bold|strong|neon|stage|cinematic/i.test(style)) {
    return STRONG_ACCENTS;
  }

  return DEFAULT_ACCENTS;
};

const defaultNodes = (scene: Scene): VisualSpec["nodes"] => {
  if (scene.visual.nodes && scene.visual.nodes.length >= 3) {
    return scene.visual.nodes;
  }

  const labels = (scene.visual.items ?? [])
    .map((item) => item.title)
    .slice(0, 3);
  const fallback = ["Perceive", "Reason", "Act"];
  const used = labels.length === 3 ? labels : fallback;

  return used.map((label, index) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `node-${index + 1}`,
    label,
    detail: scene.visual.items?.[index]?.body,
  }));
};

export const applyVisuals = (storyboard: Storyboard): Storyboard => {
  const accents = pickPalette(storyboard.style);
  const scenes = storyboard.scenes.map((scene, index) => {
    const accentColor = accents[index % accents.length];
    const items =
      scene.visual.items && scene.visual.items.length > 0
        ? scene.visual.items.map((item) => ({
            title: item.title,
            body: item.body,
          }))
        : undefined;

    const visual: VisualSpec = {
      accentColor: scene.visual.accentColor ?? accentColor,
      items,
      nodes: scene.type === "diagram" ? defaultNodes(scene) : scene.visual.nodes,
      edges: scene.visual.edges,
      quote: scene.type === "quote" ? scene.narration : scene.visual.quote,
      attribution:
        scene.type === "quote"
          ? undefined
          : scene.visual.attribution,
    };

    if (scene.type === "diagram" && visual.nodes && visual.nodes.length > 1) {
      visual.edges = visual.nodes.slice(0, -1).map((node, nodeIndex) => {
        const next = visual.nodes?.[nodeIndex + 1];
        return {
          from: node.id,
          to: next?.id ?? node.id,
        };
      });
    }

    return {
      ...scene,
      visual,
    };
  });

  return {
    ...storyboard,
    scenes,
  };
};
