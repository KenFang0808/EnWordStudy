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

const summarizeScene = (scene: Scene): string => {
  const parts = [
    scene.onScreenText.title,
    scene.onScreenText.subtitle,
    scene.onScreenText.body,
    ...(scene.visual.items ?? []).flatMap((item) => [item.title, item.body]),
    scene.narration,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  return parts.slice(0, 5).join(". ");
};

const protagonist = (audience: string): string => {
  if (/student/i.test(audience) && /professional/i.test(audience)) {
    return "a young professional or student speaker";
  }
  if (/student/i.test(audience)) {
    return "a student speaker";
  }
  return "a young professional speaker";
};

const isVocabularyTopic = (topic: string): boolean => /^[a-zA-Z-]+$/.test(topic.trim());

const buildImagePrompt = (storyboard: Storyboard, scene: Scene): string => {
  const orientation =
    storyboard.height > storyboard.width ? "vertical short-video composition" : "horizontal presentation composition";
  const sceneSummary = summarizeScene(scene);
  const speaker = protagonist(storyboard.audience);
  const style =
    "realistic documentary photo, cinematic lighting, natural human pose, clear facial direction, professional environment, high detail";

  if (isVocabularyTopic(storyboard.topic)) {
    switch (scene.type) {
      case "intro":
        return `Realistic English vocabulary learning scene for the word ${storyboard.topic}, ${orientation}, a learner studying one important new word with strong focus, dictionary or notebook nearby, thoughtful academic mood, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
      case "content":
        if (scene.id === "definition") {
          return `Realistic vocabulary explanation scene for the word ${storyboard.topic}, ${orientation}, learner or teacher studying meaning carefully, notebook, dictionary, and focused face, visual feeling of understanding a difficult word, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
        }
        return `Realistic English learning practice scene for the word ${storyboard.topic}, ${orientation}, learner reviewing usage and nuance in a study environment, natural human pose, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
      case "diagram":
        return `Realistic teaching scene for the word ${storyboard.topic}, ${orientation}, visual comparison of three valuable things someone could waste such as money, time, and opportunity, classroom or study setting, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
      case "list":
        return `Realistic example sentence scene for the word ${storyboard.topic}, ${orientation}, three everyday situations that show careless waste, such as wasting savings, wasting free time, and missing a good chance, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
      case "quote":
        return `Realistic close portrait for the English word ${storyboard.topic}, ${orientation}, reflective expression showing regret after wasting something valuable, elegant study or life setting, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
      case "outro":
        return `Realistic closing learning scene for the English word ${storyboard.topic}, ${orientation}, learner remembering a new word with confidence, notebook and calm study environment, hopeful finish, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
      default:
        return `Realistic English vocabulary learning scene for the word ${storyboard.topic}, ${orientation}, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
    }
  }

  switch (scene.type) {
    case "intro":
      return `Realistic opening shot for a short video about ${storyboard.topic}, ${orientation}, ${speaker} standing on a small stage under soft spotlight, speaking with confidence to an unseen audience, body language focused on clarity and trust, cinematic depth, no text, no watermark. Style: ${style}. Content focus: helping people understand you, trust you, and remember one main point. Scene details: ${sceneSummary}.`;
    case "content":
      if (scene.id === "definition") {
        return `Realistic coaching scene for ${storyboard.topic}, ${orientation}, ${speaker} practicing a presentation with one simple core message on a tablet or cue card, clean desk or rehearsal room, minimal distractions, visual emphasis on one takeaway and removing extra details, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
      }
      if (scene.id === "audience") {
        return `Realistic practice scene for ${storyboard.topic}, ${orientation}, ${speaker} recording a one minute talk on a phone or laptop camera, reviewing notes and transitions, rehearsal setting, focused self-improvement mood, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
      }
      return `Realistic explainer scene for ${storyboard.topic}, ${orientation}, ${speaker} presenting one clear idea in a professional learning environment, supportive audience context, natural gestures, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
    case "diagram":
      return `Realistic presentation scene for ${storyboard.topic}, ${orientation}, ${speaker} pointing to a screen that clearly shows a three-step speaking structure with visual blocks only: opening hook, main points, short ending, classroom or meeting-room setting, natural staging, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
    case "list":
      return `Realistic delivery coaching scene for ${storyboard.topic}, ${orientation}, close or medium shot of ${speaker} speaking calmly, deliberate pause, hand emphasis on key words, relaxed confident posture, presentation practice environment, no text, no watermark. Style: ${style}. Content focus: slower pace, stress key words, pause after important ideas. Scene details: ${sceneSummary}.`;
    case "quote":
      return `Realistic reflective portrait for ${storyboard.topic}, ${orientation}, ${speaker} after finishing a talk, calm expression, subtle visual cues for clarity, structure, and calm delivery in the environment, elegant composition, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
    case "outro":
      return `Realistic closing shot for ${storyboard.topic}, ${orientation}, ${speaker} stepping forward with confidence after practice, holding simple notes, determined and approachable expression, message-focused speaking success, cinematic finish, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
    default:
      return `Realistic educational scene for ${storyboard.topic}, ${orientation}, ${speaker}, natural public speaking practice setting, cinematic but believable composition, no text, no watermark. Style: ${style}. Scene details: ${sceneSummary}.`;
  }
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
      imagePrompt: scene.visual.imagePrompt ?? buildImagePrompt(storyboard, scene),
      imageFile: scene.visual.imageFile,
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
